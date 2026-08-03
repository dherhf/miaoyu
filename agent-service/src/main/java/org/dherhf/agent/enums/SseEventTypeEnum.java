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

    SseEventTypeEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
