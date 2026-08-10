package org.dherhf.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

/**
 * CORS 配置（WebFlux），统一在网关层处理跨域。
 */
@Configuration
public class CorsConfig {

    /**
     * 创建 CORS 过滤器 Bean，统一在网关层处理跨域请求。
     * <p>
     * 配置允许所有来源（Origin Pattern）、所有 HTTP 方法、所有请求头，
     * 允许携带凭证（Cookie），预检缓存 3600 秒。对所有路径 {@code /**} 生效。
     *
     * @return 配置好的 CorsWebFilter 实例
     */
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }
}
