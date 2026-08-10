package org.dherhf.agent.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 会话列表项。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionSummary {
    private String sessionId;
    private String title;
    private String status;
    private LocalDateTime lastMessageAt;
    private LocalDateTime createdAt;
}
