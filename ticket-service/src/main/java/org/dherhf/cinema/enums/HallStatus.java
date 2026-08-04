package org.dherhf.cinema.enums;

import lombok.Getter;

@Getter
public enum HallStatus {
    INACTIVE(0, "未启用"),
    ACTIVE(1, "启用");

    private final int code;
    private final String desc;

    HallStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
