package org.dherhf.auth.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户信息视图对象,手机号已脱敏。
 */
@Data
public class UserInfoVO {

    /** 用户 ID */
    private Long id;

    /** 手机号（脱敏,如 {@code 138****8888}） */
    private String phone;

    /** 昵称 */
    private String nickname;

    /** 状态：1-正常,0-禁用 */
    private Integer status;

    /** 创建时间 */
    private LocalDateTime createdAt;
}
