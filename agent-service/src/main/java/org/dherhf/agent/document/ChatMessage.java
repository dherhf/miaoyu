package org.dherhf.agent.document;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 对话消息（嵌套于 ChatSessionDocument.messages 数组中）。
 * <p>
 * 单条消息可能包含纯文本回复（content），也可能同时携带卡片数据（cardType + cardData）。
 * 当 role=user 时通常只含 content；role=assistant 时可能同时含 content 和 card。
 * </p>
 */
@Data
public class ChatMessage implements Serializable {

    /** 消息序号（在同一会话内自增，1-based） */
    private Integer msgId;

    /** 角色：user / assistant / system */
    private String role;

    /** 文本内容 */
    private String content;

    /** 卡片类型，参见 CardTypeEnum；无卡片时为 null */
    private String cardType;

    /** 卡片数据（JSON 结构，因 cardType 而异） */
    private Object cardData;

    /** 本轮 LLM 识别出的意图（BUY_TICKET/MODIFY/QUERY_ORDER/FUZZY_RECOMMEND/OTHER） */
    private String intent;

    /** 本轮 LLM 提取的槽位快照 */
    private Object slots;

    /** 消息创建时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
