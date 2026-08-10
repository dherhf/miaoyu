package org.dherhf.order.enums;

import lombok.Getter;

/**
 * 订单状态枚举，定义订单全生命周期状态。
 * <p>
 * 状态流转：PENDING → PAID → CHECKED（正常）；PENDING → CANCELLED（用户/超时取消）；
 * PAID → REFUNDED（退票）；PAID → EXPIRED（场次结束后失效）。
 */
@Getter
public enum OrderStatus {
    /** 待支付：锁座后、支付前的状态 */
    PENDING("pending", "待支付"),
    /** 已出票：支付成功后的状态 */
    PAID("paid", "已出票"),
    /** 已取消：用户主动取消或超时自动取消 */
    CANCELLED("cancelled", "已取消"),
    /** 已退票：已出票订单退款后的状态 */
    REFUNDED("refunded", "已退票"),
    /** 已检票：到场核销后的状态 */
    CHECKED("checked", "已检票"),
    /** 已过期：场次结束后已出票订单的终态 */
    EXPIRED("expired", "已过期");

    /** 状态码，与数据库存储值一致 */
    private final String code;
    /** 状态中文描述 */
    private final String desc;

    /**
     * 构造订单状态枚举值。
     *
     * @param code 状态码（存入数据库的字符串）
     * @param desc 状态中文描述
     */
    OrderStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
