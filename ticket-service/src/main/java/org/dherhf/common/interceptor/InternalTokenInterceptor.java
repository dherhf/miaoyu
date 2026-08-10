package org.dherhf.common.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

/**
 * 内部接口 Token 拦截器,校验 {@code X-Internal-Token} 请求头。
 * <p>
 * agent-service 调用 ticket-service 的 {@code /internal/**} 接口时,
 * 需携带与约定一致的静态 Token,防止外部直接访问内部接口。
 */
@Component
@RequiredArgsConstructor
public class InternalTokenInterceptor implements HandlerInterceptor {

    /** 期望的内部 Token，从配置文件读取，默认值为 miaoyu-internal-token-2026 */
    @Value("${internal.token:miaoyu-internal-token-2026}")
    private String expectedToken;

    /**
     * 请求预处理：校验请求头中的 X-Internal-Token 是否匹配，
     * 不匹配则返回 403 禁止访问。
     *
     * @param request  HTTP 请求
     * @param response HTTP 响应
     * @param handler  处理器
     * @return true 表示放行，false 表示拦截
     * @throws Exception 写入响应时的 IO 异常
     */
    @Override
    public boolean preHandle(HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws Exception {
        String token = request.getHeader("X-Internal-Token");
        if (token == null || !token.equals(expectedToken)) {
            writeForbidden(response);
            return false;
        }
        return true;
    }

    /**
     * 向响应写入 403 禁止访问的 JSON 错误信息。
     *
     * @param response HTTP 响应
     * @throws IOException 写入响应时的 IO 异常
     */
    private void writeForbidden(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":403,\"message\":\"禁止访问\",\"data\":null}");
    }
}