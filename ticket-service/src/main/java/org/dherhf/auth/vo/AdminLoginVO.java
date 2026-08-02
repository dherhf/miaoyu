package org.dherhf.auth.vo;

import lombok.Data;

/**
 * 管理员登录响应 DTO。
 */
@Data
public class AdminLoginVO {

    /** JWT Token */
    private String token;

    /** 管理员信息 */
    private AdminInfoVO adminInfo;
}
