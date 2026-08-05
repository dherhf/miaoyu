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

    @Bean
    public RequestInterceptor internalTokenInterceptor() {
        return template -> template.header("X-Internal-Token", internalToken);
    }

    @Bean
    public Request.Options requestOptions() {
        return new Request.Options(
                5, TimeUnit.SECONDS,
                10, TimeUnit.SECONDS,
                true
        );
    }
}
