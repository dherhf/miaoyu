package org.dherhf.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 登录请求 DTO,用户端和管理端共用。
 */
@Data
public class LoginRequest {

    /** 手机号 */
    @NotBlank(message = "手机号不能为空")
    private String phone;

    /** 密码 */
    @NotBlank(message = "密码不能为空")
    private String password;
}
