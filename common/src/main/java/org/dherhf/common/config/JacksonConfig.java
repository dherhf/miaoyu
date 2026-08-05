package org.dherhf.common.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ext.javatime.ser.LocalDateSerializer;
import tools.jackson.databind.ext.javatime.ser.LocalDateTimeSerializer;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Jackson 全局配置。
 * <p>
 * 1. Long → String：雪花算法 ID 超过 JS 安全整数范围（2^53-1），序列化为 String 防止前端精度丢失。
 * 2. LocalDateTime → "yyyy-MM-dd HH:mm:ss"：统一日期时间格式（蚂蚁规范）。
 * 3. LocalDate → "yyyy-MM-dd"：日期格式。
 * <p>
 * Spring Boot 4.x 使用 Jackson 3.x（tools.jackson 包），
 * 通过 {@link JsonMapperBuilderCustomizer} 自定义 {@code JsonMapper.Builder}。
 */
@Configuration
public class JacksonConfig {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Bean
    public JsonMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> {
            SimpleModule module = new SimpleModule();
            module.addSerializer(Long.class, ToStringSerializer.instance);
            module.addSerializer(Long.TYPE, ToStringSerializer.instance);
            module.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(DATETIME_FORMATTER));
            module.addSerializer(LocalDate.class, new LocalDateSerializer(DATE_FORMATTER));
            builder.addModule(module);
        };
    }
}
