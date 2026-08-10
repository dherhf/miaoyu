package org.dherhf.cinema.enums;

import lombok.Getter;

/**
 * 影院状态枚举。
 * <p>
 * 定义影院营业与停业两种状态及其对应的编号与描述。
 */
@Getter
public enum CinemaStatus {
    /** 停业 */
    CLOSED(0, "停业"),
    /** 营业 */
    OPEN(1, "营业");

    private final int code;
    private final String desc;

    /**
     * 构造影院状态枚举。
     *
     * @param code 状态编号
     * @param desc 状态描述
     */
    CinemaStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}