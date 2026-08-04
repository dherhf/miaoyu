package org.dherhf.agent.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB 配置。
 * <p>
 * 连接信息由 spring.data.mongodb 注入，此处声明 repository 扫描路径和审计支持。
 * ObjectMapper 由 Spring Boot 自动配置，已包含 Java 8 date/time 模块支持。
 * </p>
 */
@Configuration
@EnableMongoRepositories(basePackages = "org.dherhf.agent.repository")
@EnableMongoAuditing
public class MongoConfig {
}
