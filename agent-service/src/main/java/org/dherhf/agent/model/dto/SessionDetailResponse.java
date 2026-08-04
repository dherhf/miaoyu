package org.dherhf.agent.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 会话详情响应，含完整消息列表和槽位状态。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionDetailResponse {

    private String sessionId;
    private String title;
    private String status;
    private Object slotState;
    private LocalDateTime createdAt;
    private List<MessageItem> messages;

    @Data
    public static class MessageItem {
        private Integer msgId;
        private String role;
        private String content;
        private String cardType;
        private Object cardData;
        private String intent;
        private Object slots;
        private LocalDateTime createdAt;
    }
}
