package org.dherhf.auth.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 管理员登录响应 DTO。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminLoginVO {

    /** JWT Token */
    private String token;

    /** 管理员信息 */
    private AdminInfoVO adminInfo;
}
