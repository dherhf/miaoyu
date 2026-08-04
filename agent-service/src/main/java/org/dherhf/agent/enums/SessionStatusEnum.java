package org.dherhf.agent.enums;

/**
 * 会话状态。
 */
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

    public String getValue() {
        return value;
    }

    public static SessionStatusEnum fromValue(String value) {
        for (SessionStatusEnum status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        return ACTIVE;
    }
}
