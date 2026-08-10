package org.dherhf.agent.document;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.dherhf.agent.model.ticket.SlotState;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 对话消息（独立文档，存储于 chat_messages 集合）。
 * <p>
 * 单条消息可能包含纯文本回复（content），也可能同时携带卡片数据（cardType + cardData）。
 * 当 role=user 时通常只含 content；role=assistant 时可能同时含 content 和 card。
 * </p>
 */
@Data
@Document(collection = "chat_messages")
@CompoundIndex(name = "idx_session_msgid", def = "{'sessionId':1,'msgId':1}", unique = true)
public class ChatMessage implements Serializable {

    /** MongoDB ObjectId */
    @Id
    private String id;

    /** 所属会话 ID */
    @Indexed
    private String sessionId;

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
    private SlotState slots;

    /** 消息创建时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    /**
     * 将历史对话列表格式化为文本块（含【历史对话】标题），为空时返回空字符串。
     *
     * @param messages 历史对话消息列表
     * @return 格式化后的历史对话文本块；列表为空时返回空字符串
     */
    public static String formatHistory(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("【历史对话】\n");
        for (ChatMessage msg : messages) {
            String role = msg.getRole();
            String text = msg.getContent();
            if (role != null && text != null) {
                sb.append(role.equals("user") ? "用户" : "助手").append(": ").append(text).append("\n");
            }
        }
        return sb.toString();
    }
}
