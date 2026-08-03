package org.dherhf.agent.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB 配置。
 * <p>
 * 连接信息由 spring.data.mongodb.uri 注入，此处声明 repository 扫描路径和审计支持。
 * </p>
 */
@Configuration
@EnableMongoRepositories(basePackages = "org.dherhf.agent.repository")
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
