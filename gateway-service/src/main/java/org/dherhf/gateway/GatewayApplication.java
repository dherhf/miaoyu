package org.dherhf.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * API 网关服务启动入口。
 * <p>
 * 基于 Spring Cloud Gateway（WebFlux），负责统一路由转发、JWT 认证、
 * CORS 跨域处理和限流等横切关注点。
 */
@SpringBootApplication
public class GatewayApplication {

    /**
     * 程序入口方法，启动 Spring Boot 应用。
     *
     * @param args 命令行参数，可覆盖配置文件中的属性
     */
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
