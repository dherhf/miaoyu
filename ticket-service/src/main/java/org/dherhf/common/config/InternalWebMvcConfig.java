package org.dherhf.common.config;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.interceptor.InternalTokenInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置,注册 {@link InternalTokenInterceptor} 拦截 {@code /internal/**} 路径。
 */
@Configuration
@RequiredArgsConstructor
public class InternalWebMvcConfig implements WebMvcConfigurer {

    private final InternalTokenInterceptor internalTokenInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(internalTokenInterceptor)
                .addPathPatterns("/internal/**")
                // 支付回调由 HMAC 验签，不走内部 Token 拦截器
                .excludePathPatterns("/internal/payment/callback");
    }
}
