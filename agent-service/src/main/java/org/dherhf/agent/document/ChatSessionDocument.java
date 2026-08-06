package org.dherhf.agent.document;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.dherhf.agent.model.ticket.SlotState;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 对话会话 MongoDB 文档（对应 chat_sessions 集合）。
 * <p>
 * 每个会话包含：
 * <ul>
 *   <li>slotState：当前槽位状态（movieId/movieName/cinemaId/cinemaName/hallId/hallType/hallName/time/count/schedulesId/seatIds/priceMax/negateSlot/negateCount）</li>
 *   <li>消息列表存储于独立的 chat_messages 集合，通过 sessionId 关联</li>
 * </ul>
 * </p>
 */
@Data
@Document(collection = "chat_sessions")
public class ChatSessionDocument implements Serializable {

    /** MongoDB 自增/分配 _id，本场景使用 sessionId（UUID）作为业务 ID，_id 使用 ObjectId 自动生成 */
    @Id
    private String id;

    /** 会话 UUID（业务主键） */
    @Indexed(unique = true)
    private String sessionId;

    /** 用户 ID（从 JWT 解析） */
    @Indexed
    private Long userId;

    /** 会话标题，初始"新对话"，首轮后自动更新为摘要 */
    private String title;

    /** 会话状态：active / completed / expired */
    private String status;

    /**
     * 槽位状态。
     */
    private SlotState slotState;

    /** 最后消息时间（用于列表排序与过期清理） */
    @Indexed
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastMessageAt;

    @CreatedDate
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
