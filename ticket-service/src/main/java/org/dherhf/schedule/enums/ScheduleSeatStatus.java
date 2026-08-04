package org.dherhf.schedule.enums;

import lombok.Getter;

@Getter
public enum ScheduleSeatStatus {
    AVAILABLE("available", "可选"),
    LOCKED("locked", "已锁定"),
    SOLD("sold", "已售出");

    private final String code;
    private final String desc;

    ScheduleSeatStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
