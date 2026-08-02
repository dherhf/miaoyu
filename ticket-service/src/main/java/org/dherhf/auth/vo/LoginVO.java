package org.dherhf.auth.vo;

import lombok.Data;

/**
 * 用户登录响应 DTO。
 */
@Data
public class LoginVO {

    /** JWT Token */
    private String token;

    /** 用户信息 */
    private UserInfoVO userInfo;
}
