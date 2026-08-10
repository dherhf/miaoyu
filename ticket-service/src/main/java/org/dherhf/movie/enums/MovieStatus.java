package org.dherhf.movie.enums;

import lombok.Getter;

/**
 * 影片状态枚举。
 * <p>
 * 定义影片的上架/下架两种状态，用于影片管理和用户端展示控制。
 */
@Getter
public enum MovieStatus {
    /** 下架状态，用户端不可见 */
    OFFLINE(0, "下架"),
    /** 上架状态，用户端可见 */
    ONLINE(1, "上架");

    /** 状态码 */
    private final int code;

    /** 状态描述 */
    private final String desc;

    /**
     * 构造影片状态枚举。
     *
     * @param code 状态码
     * @param desc 状态描述
     */
    MovieStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
