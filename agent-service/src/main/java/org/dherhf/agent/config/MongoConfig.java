package org.dherhf.agent.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB 配置。
 * <p>
 * 连接信息由 spring.data.mongodb 注入，此处声明 repository 扫描路径和审计支持。
 * 同时注册 ObjectMapper，启用 Java 8 date/time（LocalDateTime 等）序列化支持，
 * 使用 ISO-8601 格式（带 T 分隔符）以确保与 MongoDB MappingMongoConverter 兼容。
 * </p>
 */
@Configuration
@EnableMongoRepositories(basePackages = "org.dherhf.agent.repository")
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.disable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        return mapper;
    }
}
