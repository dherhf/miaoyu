package org.dherhf.schedule.enums;

import lombok.Getter;

/**
 * 场次状态枚举。
 * <p>
 * 定义场次的生命周期状态：可售、已取消、已结束。
 */
@Getter
public enum ScheduleStatus {
    /** 可售，场次正常在售，用户可购票 */
    ON_SALE("onsale", "可售"),
    /** 已取消，场次被管理员取消或自动取消 */
    CANCELLED("cancelled", "已取消"),
    /** 已结束，场次放映时间已过，自动或手动结束 */
    ENDED("ended", "已结束");

    /** 状态编码，存储到数据库的值 */
    private final String code;
    /** 状态描述，用于展示 */
    private final String desc;

    ScheduleStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
