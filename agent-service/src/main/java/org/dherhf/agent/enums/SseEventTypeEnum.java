package org.dherhf.agent.enums;

/**
 * SSE 事件类型枚举，对应 {@code event: xxx} 字段。
 */
public enum SseEventTypeEnum {

    /** AI 回复文本片段 */
    MESSAGE("message"),

    /** 动态卡片数据 */
    CARD("card"),

    /** 本轮对话结束标记 */
    DONE("done"),

    /** 异常事件 */
    ERROR("error");

    private final String value;

    /**
     * 枚举构造方法，绑定 SSE 事件类型的字符串值。
     *
     * @param value SSE 事件类型的字符串标识
     */
    SseEventTypeEnum(String value) {
        this.value = value;
    }

    /**
     * 获取 SSE 事件类型的字符串标识。
     *
     * @return SSE 事件类型字符串值
     */
    public String getValue() {
        return value;
    }
}
