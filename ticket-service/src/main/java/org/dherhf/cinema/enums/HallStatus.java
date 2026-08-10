package org.dherhf.cinema.enums;

import lombok.Getter;

/**
 * 影厅状态枚举。
 * <p>
 * 定义影厅启用与未启用两种状态及其对应的编号与描述。
 */
@Getter
public enum HallStatus {
    /** 未启用 */
    INACTIVE(0, "未启用"),
    /** 启用 */
    ACTIVE(1, "启用");

    private final int code;
    private final String desc;

    /**
     * 构造影厅状态枚举。
     *
     * @param code 状态编号
     * @param desc 状态描述
     */
    HallStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}