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
            "/api/v1/admin/auth/login"
    );

    private final JwtUtil jwtUtil;

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

    @Override
    public int getOrder() {
        return -100;
    }

    /**
     * 返回 401 JSON 响应，格式与下游服务 Result 一致。
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
