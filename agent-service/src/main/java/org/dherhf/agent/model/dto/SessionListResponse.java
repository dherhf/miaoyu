package org.dherhf.agent.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 会话列表查询响应。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "会话列表查询响应")
public class SessionListResponse {

    @Schema(description = "总数")
    private Long total;

    @Schema(description = "当前页码")
    private Integer page;

    @Schema(description = "每页大小")
    private Integer size;

    @Schema(description = "会话记录列表")
    private List<SessionSummary> records;

    @Data
    @Schema(description = "会话摘要")
    public static class SessionSummary {

        @Schema(description = "会话ID")
        private String sessionId;

        @Schema(description = "会话标题")
        private String title;

        @Schema(description = "会话状态")
        private String status;

        @Schema(description = "最后消息时间")
        private LocalDateTime lastMessageAt;

        @Schema(description = "创建时间")
        private LocalDateTime createdAt;
    }
}
