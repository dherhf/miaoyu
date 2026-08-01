package org.dherhf.auth.dto;

import lombok.Data;

/**
 * 管理员信息视图对象。
 */
@Data
public class AdminInfoVO {

    /** 管理员 ID */
    private Long id;

    /** 管理员姓名 */
    private String name;

    /** 状态：1-正常,0-禁用 */
    private Integer status;
}
