package org.dherhf.order.enums;

import lombok.Getter;

@Getter
public enum OrderStatus {
    PENDING("pending", "待支付"),
    PAID("paid", "已出票"),
    CANCELLED("cancelled", "已取消"),
    REFUNDED("refunded", "已退票"),
    CHECKED("checked", "已检票");

    private final String code;
    private final String desc;

    OrderStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
