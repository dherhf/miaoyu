package org.dherhf.agent.enums;

import lombok.Getter;

/**
 * 会话状态。
 */
@Getter
public enum SessionStatusEnum {

    /** 活跃中 */
    ACTIVE("active"),

    /** 已完成（出票/用户主动结束） */
    COMPLETED("completed"),

    /** 已过期（超期自动过期） */
    EXPIRED("expired");

    private final String value;

    SessionStatusEnum(String value) {
        this.value = value;
    }
}
