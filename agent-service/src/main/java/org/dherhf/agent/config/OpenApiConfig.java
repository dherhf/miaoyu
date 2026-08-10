package org.dherhf.agent.config;

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

    /**
     * 构建 OpenAPI 文档对象，包含接口标题、描述、版本、联系方式、许可证及 JWT 安全方案。
     *
     * @return OpenAPI 文档配置 Bean
     */
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("妙语购票 - AI 对话服务 API")
                        .description("电影票智能体系统 AI Agent 对话接口文档\n\n"
                                + "## 认证方式\n"
                                + "所有接口需要在请求头携带 `Authorization: Bearer {token}` 进行 JWT 认证。\n"
                                + "Gateway 校验 JWT 后通过 `X-User-Id` Header 注入用户 ID。\n\n"
                                + "## 核心功能\n"
                                + "- **对话管理**：创建会话、发送消息（SSE 流式响应）、查询历史\n"
                                + "- **用户偏好**：观影偏好管理，注入 LLM 上下文实现个性化推荐")
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
