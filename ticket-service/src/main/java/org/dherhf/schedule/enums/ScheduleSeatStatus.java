package org.dherhf.schedule.enums;

import lombok.Getter;

/**
 * 场次座位状态枚举。
 * <p>
 * 定义场次座位的三种售卖状态：可选、已锁定、已售出。
 */
@Getter
public enum ScheduleSeatStatus {
    /** 可选，座位未被锁定或售出，用户可选择 */
    AVAILABLE("available", "可选"),
    /** 已锁定，用户下单锁座但尚未支付 */
    LOCKED("locked", "已锁定"),
    /** 已售出，订单已支付完成 */
    SOLD("sold", "已售出");

    /** 状态编码，存储到数据库的值 */
    private final String code;
    /** 状态描述，用于展示 */
    private final String desc;

    ScheduleSeatStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
