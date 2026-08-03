package org.dherhf.agent.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 会话列表查询响应。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionListResponse {

    private Long total;
    private Integer page;
    private Integer size;
    private List<SessionSummary> records;

    @Data
    public static class SessionSummary {
        private String sessionId;
        private String title;
        private String status;
        private LocalDateTime lastMessageAt;
        private LocalDateTime createdAt;
    }
}
