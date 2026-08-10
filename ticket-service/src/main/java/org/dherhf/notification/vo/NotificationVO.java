package org.dherhf.notification.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Schema(description = "通知信息")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationVO {

    @Schema(description = "通知ID")
    private Long id;

    @Schema(description = "通知类型")
    private String type;

    @Schema(description = "通知标题")
    private String title;

    @Schema(description = "通知内容")
    private String content;

    @Schema(description = "关联订单ID")
    private Long relatedOrderId;

    @Schema(description = "是否已读")
    private Integer isRead;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;
}
