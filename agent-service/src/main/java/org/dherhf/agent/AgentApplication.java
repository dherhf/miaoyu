package org.dherhf.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * AI 对话服务启动类。
 * <p>
 * 启用 Spring Boot 自动配置和 Feign 客户端支持。
 * </p>
 */
@SpringBootApplication
@EnableFeignClients
public class AgentApplication {

    /**
     * 应用程序入口方法，启动 Spring Boot 服务。
     *
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}
