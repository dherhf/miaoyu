package org.dherhf.gateway.filter;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.util.JwtUtil;
import org.jspecify.annotations.NonNull;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * 网关全局认证过滤器。
 * <p>
 * 在路由转发前统一执行 JWT 校验、Redis 黑名单检查、admin/user 路径权限匹配，
 * 校验通过后向下游注入 {@code X-User-Id} 和 {@code X-User-Type} Header，
 * 同时剥离客户端可能伪造的同名 Header。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private static final String BEARER_PREFIX = "Bearer ";

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/api/v1/auth/register",
            "/api/v1/auth/login",
            "/api/v1/auth/captcha",
            "/api/v1/auth/sms-code",
            "/api/v1/auth/reset-password",
            "/api/v1/admin/auth/login"
    );

    private final JwtUtil jwtUtil;

    /**
     * 核心过滤逻辑：对每个请求依次执行以下步骤。
     * <ol>
     *   <li>OPTIONS 预检请求直接放行</li>
     *   <li>公开路径（注册/登录/验证码等）直接放行，不注入 Header</li>
     *   <li>提取 Authorization Header 中的 Bearer Token</li>
     *   <li>解析并校验 Token 签名（支持双密钥轮换）</li>
     *   <li>检查 Token 是否在 Redis 黑名单中（已退出登录）</li>
     *   <li>校验路径与 Token 类型是否匹配（admin 路径仅允许 admin Token）</li>
     *   <li>剥离客户端伪造的 X-User-Id / X-User-Type，注入可信值后放行</li>
     * </ol>
     * 校验失败时统一返回 401 JSON 响应。
     *
     * @param exchange 当前请求/响应上下文
     * @param chain    网关过滤器链，用于传递给下一个过滤器
     * @return Mono&lt;Void&gt;，表示异步处理完成
     */
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, @NonNull GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        // OPTIONS 预检直接放行
        if (request.getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        // 公开路径放行（不注入 Header）
        if (PUBLIC_PATHS.contains(path)) {
            return chain.filter(exchange);
        }

        // 提取 Bearer token
        HttpHeaders headers = request.getHeaders();
        String auth = headers.getFirst(HttpHeaders.AUTHORIZATION);
        if (auth == null || !auth.startsWith(BEARER_PREFIX)) {
            return writeUnauthorized(exchange, "未提供认证token");
        }

        String token = auth.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            return writeUnauthorized(exchange, "未提供认证token");
        }

        // 解析 + 校验签名
        Claims claims = jwtUtil.parseToken(token);
        if (claims == null) {
            return writeUnauthorized(exchange, "token无效或已过期");
        }

        // 黑名单检查
        if (jwtUtil.isBlacklisted(token)) {
            return writeUnauthorized(exchange, "token已失效");
        }

        // 路径权限校验
        Long userId = jwtUtil.getUserId(claims);
        String type = jwtUtil.getType(claims);
        boolean isAdminPath = path.startsWith("/api/v1/admin/");

        if (isAdminPath && !"admin".equals(type)) {
            return writeUnauthorized(exchange, "无管理员权限");
        }
        if (!isAdminPath && !"user".equals(type)) {
            return writeUnauthorized(exchange, "Token类型不匹配");
        }

        // 剥离客户端伪造的 Header，注入可信值
        ServerHttpRequest mutated = request.mutate()
                .headers(h -> {
                    h.remove("X-User-Id");
                    h.remove("X-User-Type");
                    h.add("X-User-Id", String.valueOf(userId));
                    h.add("X-User-Type", type);
                })
                .build();

        return chain.filter(exchange.mutate().request(mutated).build());
    }

    /**
     * 设置过滤器执行优先级。
     * <p>
     * 返回 -100，确保认证过滤器在大多数其他过滤器之前执行。
     *
     * @return 过滤器顺序值，越小越先执行
     */
    @Override
    public int getOrder() {
        return -100;
    }

    /**
     * 向客户端返回 401 未授权 JSON 响应。
     * <p>
     * 响应体格式与下游服务 {@code Result} 一致：{@code {"code":401,"message":"...","data":null}}。
     *
     * @param exchange 当前请求/响应上下文
     * @param message  错误提示消息，写入响应体
     * @return Mono&lt;Void&gt;，表示响应写入完成
     */
    private Mono<Void> writeUnauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"code\":401,\"message\":\"" + message + "\",\"data\":null}";
        DataBuffer buffer = response.bufferFactory()
                .wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
