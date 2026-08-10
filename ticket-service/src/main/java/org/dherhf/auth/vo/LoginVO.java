package org.dherhf.auth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 用户登录响应 DTO。
 */
@Schema(description = "用户登录响应")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginVO {

    /** JWT Token */
    @Schema(description = "JWT Token")
    private String token;

    /** 用户信息 */
    @Schema(description = "用户信息")
    private UserInfoVO userInfo;
}
