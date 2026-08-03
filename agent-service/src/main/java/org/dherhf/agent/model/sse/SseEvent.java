package org.dherhf.agent.model.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * SSE 事件对象，对应一个 {@code event: xxx\ndata: {...}} 推送。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SseEvent {

    /** 事件名称：message / card / done / error */
    private String event;

    /** 事件数据（序列化为 JSON 字符串放入 data 字段） */
    private Object data;

    // ---- 工厂方法 ----

    public static SseEvent message(String content) {
        return SseEvent.builder()
                .event("message")
                .data(Map.of("content", content))
                .build();
    }

    public static SseEvent card(String cardType, Object cardData) {
        return SseEvent.builder()
                .event("card")
                .data(Map.of("cardType", cardType, "cardData", cardData))
                .build();
    }

    public static SseEvent done(String sessionId, String intent, Object slots) {
        return SseEvent.builder()
                .event("done")
                .data(Map.of(
                        "sessionId", sessionId,
                        "intent", intent == null ? "" : intent,
                        "slots", slots == null ? Map.of() : slots
                ))
                .build();
    }

    public static SseEvent error(String code, String message) {
        return SseEvent.builder()
                .event("error")
                .data(Map.of("code", code, "message", message))
                .build();
    }
}
