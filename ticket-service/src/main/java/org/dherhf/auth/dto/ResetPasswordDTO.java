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
 * 重置密码请求 DTO。
 */
@Schema(description = "重置密码请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResetPasswordDTO {

    /** 手机号,11 位数字 */
    @Schema(description = "手机号,11位数字")
    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式错误")
    private String phone;

    /** 新密码,6-20 位 */
    @Schema(description = "新密码,6-20位")
    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 20, message = "密码长度需为6-20位")
    private String newPassword;

    /** 短信验证码 */
    @Schema(description = "短信验证码")
    @NotBlank(message = "短信验证码不能为空")
    private String smsCode;
}
