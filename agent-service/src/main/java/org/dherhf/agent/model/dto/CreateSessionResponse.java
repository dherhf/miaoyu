package org.dherhf.agent.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 创建会话响应。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CreateSessionResponse {

    private String sessionId;
    private String title;
    private String status;
    private Object slotState;
    private LocalDateTime createdAt;
}
