package org.dherhf.common.config;

import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.ToStringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 序列化配置。
 * Long → String，避免雪花算法 ID 超过 JS Number.MAX_SAFE_INTEGER 精度丢失。
 * 只注册 Module Bean，Spring Boot 4 会自动挂到已有的 ObjectMapper(jacksonJsonMapper) 上。
 */
@Configuration
public class JacksonConfig {

    @Bean
    public SimpleModule longToStringModule() {
        SimpleModule module = new SimpleModule();
        module.addSerializer(Long.class, ToStringSerializer.instance);
        module.addSerializer(Long.TYPE, ToStringSerializer.instance);
        return module;
    }
}
