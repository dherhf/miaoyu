package org.dherhf;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * 票务服务启动类。
 * <p>
 * 承载影片、场次、订单、通知、偏好、审计等核心业务，
 * 通过 {@code @MapperScan} 自动扫描所有 mapper 接口，
 * {@code @EnableScheduling} 开启定时任务（如 SSE 心跳），
 * {@code @EnableAsync} 开启异步方法执行（如异步通知发送、审计日志记录）。
 */
@SpringBootApplication
@MapperScan("org.dherhf.**.mapper")
@EnableScheduling
@EnableAsync
public class TicketApplication {

    /**
     * 票务服务入口方法，启动 Spring Boot 应用。
     *
     * @param args 命令行启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(TicketApplication.class, args);
    }
}
