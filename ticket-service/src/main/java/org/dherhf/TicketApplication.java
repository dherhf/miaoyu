package org.dherhf;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * 票务服务启动类。
 */
@SpringBootApplication
@MapperScan("org.dherhf.**.mapper")
@EnableScheduling
@EnableAsync
public class TicketApplication {
    public static void main(String[] args) {
        SpringApplication.run(TicketApplication.class, args);
    }
}
