package org.dherhf.dto;

import lombok.Data;

/**
 * 管理员登录响应 DTO。
 */
@Data
public class AdminLoginResponse {

    /** JWT Token */
    private String token;

    /** 管理员信息 */
    private AdminInfoVO adminInfo;
}
