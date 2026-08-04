package org.dherhf.agent.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB 配置。
 * <p>
 * 连接信息由 spring.data.mongodb 注入，此处声明 repository 扫描路径和审计支持。
 * ObjectMapper 由 Spring Boot 4 自动配置（Jackson 3.x, tools.jackson），
 * 默认注册 JavaTimeModule、关闭 WRITE_DATES_AS_TIMESTAMPS 和 FAIL_ON_UNKNOWN_PROPERTIES。
 * </p>
 */
@Configuration
@EnableMongoRepositories(basePackages = "org.dherhf.agent.repository")
@EnableMongoAuditing
public class MongoConfig {
}
