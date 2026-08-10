package org.dherhf.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 发送短信验证码请求 DTO。
 */
@Schema(description = "发送短信验证码请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendSmsCodeDTO {

    /** 手机号,11 位数字 */
    @Schema(description = "手机号,11位数字")
    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式错误")
    private String phone;

    /** 场景类型：register-注册,reset-password-重置密码 */
    @Schema(description = "场景类型：register-注册,reset-password-重置密码")
    @NotBlank(message = "场景类型不能为空")
    @Pattern(regexp = "register|reset-password", message = "场景类型错误")
    private String scene;

    /** 图形验证码唯一标识 */
    @Schema(description = "图形验证码唯一标识")
    @NotBlank(message = "验证码ID不能为空")
    private String captchaId;

    /** 用户输入的图形验证码 */
    @Schema(description = "用户输入的图形验证码")
    @NotBlank(message = "验证码不能为空")
    @Size(min = 4, max = 4, message = "验证码长度错误")
    private String captchaCode;
}
