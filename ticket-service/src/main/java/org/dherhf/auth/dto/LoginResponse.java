package org.dherhf.auth.dto;

import lombok.Data;

/**
 * 用户登录响应 DTO。
 */
@Data
public class LoginResponse {

    /** JWT Token */
    private String token;

    /** 用户信息 */
    private UserInfoVO userInfo;
}
