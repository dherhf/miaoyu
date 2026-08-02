package org.dherhf.auth.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 用户登录响应 DTO。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginVO {

    /** JWT Token */
    private String token;

    /** 用户信息 */
    private UserInfoVO userInfo;
}
