package org.dherhf.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 登录请求 DTO,用户端和管理端共用。
 */
@Schema(description = "登录请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginDTO {

    /** 手机号 */
    @Schema(description = "手机号")
    @NotBlank(message = "手机号不能为空")
    private String phone;

    /** 密码 */
    @Schema(description = "密码")
    @NotBlank(message = "密码不能为空")
    private String password;
}
