package org.dherhf.agent.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 创建会话响应。
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "创建会话响应")
public class CreateSessionResponse {

    @Schema(description = "会话ID")
    private String sessionId;

    @Schema(description = "会话标题")
    private String title;

    @Schema(description = "会话状态")
    private String status;

    @Schema(description = "槽位状态")
    private Object slotState;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;
}
