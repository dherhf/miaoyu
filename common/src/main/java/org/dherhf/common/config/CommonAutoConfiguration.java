package org.dherhf.common.config;

import org.dherhf.common.util.CryptoUtil;
import org.dherhf.common.util.JwtUtil;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.ComponentScan;

/**
 * Common 模块自动配置。
 * <p>
 * 通过 Spring Boot 自动配置机制注册 {@link JwtUtil}、{@link CryptoUtil} 和 {@link JacksonConfig}，
 * 使各服务模块无需手动配置 ComponentScan。
 */
@AutoConfiguration
@ConditionalOnClass(JwtUtil.class)
@ComponentScan(basePackageClasses = {
        JwtUtil.class,
        CryptoUtil.class,
        JacksonConfig.class
})
public class CommonAutoConfiguration {
}
