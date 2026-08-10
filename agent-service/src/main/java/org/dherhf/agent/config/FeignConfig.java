package org.dherhf.agent.config;

import feign.RequestInterceptor;
import feign.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Feign 全局配置，替代原 RestClientConfig。
 * <p>
 * 统一注入 X-Internal-Token 头并设置连接/读取超时。
 * </p>
 */
@Configuration
public class FeignConfig {

    @Value("${ticket-service.internal-token}")
    private String internalToken;

    /**
     * 创建 Feign 请求拦截器，为每个请求自动注入内部认证头 X-Internal-Token。
     *
     * @return 请求拦截器实例，在请求模板中添加内部 Token 头
     */
    @Bean
    public RequestInterceptor internalTokenInterceptor() {
        return template -> template.header("X-Internal-Token", internalToken);
    }

    /**
     * 创建 Feign 请求超时配置，连接超时 5 秒、读取超时 10 秒、启用重试。
     *
     * @return Feign 请求选项，包含连接和读取超时设置
     */
    @Bean
    public Request.Options requestOptions() {
        return new Request.Options(
                5, TimeUnit.SECONDS,
                10, TimeUnit.SECONDS,
                true
        );
    }
}
