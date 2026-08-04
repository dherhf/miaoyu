package org.dherhf.schedule.enums;

import lombok.Getter;

@Getter
public enum ScheduleStatus {
    ON_SALE("onsale", "可售"),
    CANCELLED("cancelled", "已取消"),
    ENDED("ended", "已结束");

    private final String code;
    private final String desc;

    ScheduleStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
