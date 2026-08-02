package org.dherhf.notification.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationVO {

    private Long id;
    private String type;
    private String title;
    private String content;
    private Long relatedOrderId;
    private Integer isRead;
    private LocalDateTime createdAt;
}
