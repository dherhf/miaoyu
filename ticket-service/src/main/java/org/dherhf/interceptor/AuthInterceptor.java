package org.dherhf.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.dherhf.util.JwtUtil;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

/**
 * 认证拦截器,对 {@code /api/v1/**} 路径执行 JWT 黑名单校验。
 * <p>
 * 校验流程：
 * <ol>
 *   <li>OPTIONS 预检请求直接放行</li>
 *   <li>从 Authorization 请求头提取 Bearer Token</li>
 *   <li>验证 Token 有效性（签名 + 黑名单）</li>
 *   <li>校验 Token 类型与请求路径匹配（admin 路径需 admin Token,反之需 user Token）</li>
 *   <li>将用户/管理员 ID 和 Token 类型注入 {@code request.setAttribute("userId", ...)}
 *       和 {@code request.setAttribute("type", ...)},供 Controller 通过
 *       {@code @RequestAttribute} 获取</li>
 * </ol>
 *
 * @see JwtUtil
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws Exception {
        // 1. OPTIONS 请求直接放行（CORS 预检）
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // 2. 获取 Authorization Header
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            writeUnauthorized(response, "未提供认证token");
            return false;
        }

        // 3. 提取 token
        String token = authorization.substring(BEARER_PREFIX.length());

        // 4. 验证 token 有效性（已包含黑名单检查）
        if (!jwtUtil.isTokenValid(token)) {
            writeUnauthorized(response, "token无效或已过期");
            return false;
        }

        // 5. 提取用户信息并存入 request
        Long userId = jwtUtil.getUserId(token);
        String type = jwtUtil.getType(token);

        String path = request.getRequestURI();
        boolean isAdminPath = path.startsWith("/api/v1/admin/");

        if (isAdminPath && !"admin".equals(type)) {
            writeUnauthorized(response, "无管理员权限");
            return false;
        }
        if (!isAdminPath && !"user".equals(type)) {
            writeUnauthorized(response, "Token类型不匹配");
            return false;
        }

        request.setAttribute("userId", userId);
        request.setAttribute("type", type);

        return true;
    }

    /**
     * 向客户端写入 JSON 格式的未授权错误响应。
     *
     * @param response HTTP 响应对象
     * @param message  错误消息
     * @throws IOException 写入响应体时可能抛出 IO 异常
     */
    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":401,\"message\":\"" + message + "\",\"data\":null}");
    }
}
