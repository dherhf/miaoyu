package org.dherhf.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SpringDoc OpenAPI 3 配置类。
 * <p>
 * 定义 API 文档元信息和 JWT Bearer Token 安全方案，
 * 启动后访问 {@code /swagger-ui.html} 查看接口文档。
 */
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "Bearer JWT";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("妙语购票 - 票务服务 API")
                        .description("电影票智能体系统票务后端接口文档\n\n"
                                + "## 认证方式\n"
                                + "大部分接口需要在请求头携带 `Authorization: Bearer {token}` 进行 JWT 认证。\n\n"
                                + "## 接口分组\n"
                                + "- **用户端接口** `/api/v1/**`：面向 C 端用户\n"
                                + "- **管理端接口** `/api/v1/admin/**`：面向管理后台\n"
                                + "- **内部接口** `/internal/**`：agent-service 调用，需 X-Internal-Token")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("丁荣辉")
                                .email("dherhf@foxmail.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT Bearer Token 认证，格式：Bearer {token}")));
    }
}
