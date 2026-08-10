package org.dherhf.agent.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 会话详情响应，含完整消息列表和槽位状态。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "会话详情响应，含完整消息列表和槽位状态")
public class SessionDetailResponse {

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

    @Schema(description = "消息列表")
    private List<MessageItem> messages;

    @Data
    @Schema(description = "消息项")
    public static class MessageItem {

        @Schema(description = "消息ID")
        private Integer msgId;

        @Schema(description = "消息角色")
        private String role;

        @Schema(description = "消息内容")
        private String content;

        @Schema(description = "卡片类型")
        private String cardType;

        @Schema(description = "卡片数据")
        private Object cardData;

        @Schema(description = "意图")
        private String intent;

        @Schema(description = "槽位")
        private Object slots;

        @Schema(description = "创建时间")
        private LocalDateTime createdAt;
    }
}
