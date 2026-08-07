package org.dherhf.agent.model.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
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
        Map<String, Object> payload = new HashMap<>();
        payload.put("cardType", cardType);
        payload.put("cardData", cardData);
        return SseEvent.builder()
                .event("card")
                .data(payload)
                .build();
    }

    public static SseEvent done(String sessionId, String intent, Object slots, String title) {
        Map<String, Object> data = new HashMap<>();
        data.put("sessionId", sessionId);
        data.put("intent", intent == null ? "" : intent);
        data.put("slots", slots == null ? Map.of() : slots);
        if (title != null) {
            data.put("title", title);
        }
        return SseEvent.builder()
                .event("done")
                .data(data)
                .build();
    }

    public static SseEvent error(String code, String message) {
        return SseEvent.builder()
                .event("error")
                .data(Map.of("code", code, "message", message))
                .build();
    }
}
