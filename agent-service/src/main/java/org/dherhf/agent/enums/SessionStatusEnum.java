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

    /**
     * 枚举构造方法，绑定会话状态的字符串值。
     *
     * @param value 会话状态的字符串标识
     */
    SessionStatusEnum(String value) {
        this.value = value;
    }

    /**
     * 获取会话状态的字符串标识。
     *
     * @return 会话状态字符串值
     */
    public String getValue() {
        return value;
    }

    /**
     * 根据字符串值查找对应的会话状态枚举（不区分大小写）。
     *
     * @param value 会话状态字符串值
     * @return 匹配的枚举实例；未匹配时返回 ACTIVE
     */
    public static SessionStatusEnum fromValue(String value) {
        for (SessionStatusEnum status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        return ACTIVE;
    }
}
