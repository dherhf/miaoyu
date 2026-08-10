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

    /**
     * 注册拦截器，仅对内部接口路径 {@code /internal/**} 进行 Token 校验。
     *
     * @param registry 拦截器注册器
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(internalTokenInterceptor)
                .addPathPatterns("/internal/**");
    }
}