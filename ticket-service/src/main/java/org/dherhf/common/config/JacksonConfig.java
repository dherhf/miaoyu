package org.dherhf.common.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.ToStringSerializer;

/**
 * Jackson 全局配置：将 Long 序列化为 String，防止前端 JS 精度丢失。
 * <p>
 * 雪花算法生成的 ID 是 64 位 Long，超过 JS 安全整数范围（2^53-1），
 * 前端 JSON.parse 后精度丢失导致 ID 不匹配。
 * <p>
 * Spring Boot 4.x 使用 Jackson 3.x（tools.jackson 包），
 * 通过 {@link JsonMapperBuilderCustomizer} 自定义 {@code JsonMapper.Builder}。
 */
@Configuration
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer longToStringCustomizer() {
        return builder -> {
            SimpleModule module = new SimpleModule();
            module.addSerializer(Long.class, ToStringSerializer.instance);
            module.addSerializer(Long.TYPE, ToStringSerializer.instance);
            builder.addModule(module);
        };
    }
}
