package org.dherhf.notification.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 消息通知实体类，对应数据库 notification 表。
 * <p>
 * 存储用户的通知消息，包括通知类型、标题、内容、关联订单 ID 和已读状态。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("notification")
public class Notification {

    /** 主键 ID，自增 */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 用户 ID */
    private Long userId;

    /** 通知类型 */
    private String type;

    /** 通知标题 */
    private String title;

    /** 通知内容 */
    private String content;

    /** 关联订单 ID */
    private Long relatedOrderId;

    /** 是否已读：0-未读，1-已读 */
    private Integer isRead;

    /** 创建时间 */
    private LocalDateTime createdAt;
}
