package org.dherhf.agent.repository;

import org.dherhf.agent.document.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * 对话消息 MongoDB Repository（对应 chat_messages 集合）。
 */
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    /**
     * 按会话 ID 查询全部消息，按 msgId 正序排列。
     */
    List<ChatMessage> findBySessionIdOrderByMsgIdAsc(String sessionId);

    /**
     * 统计会话消息总数。
     */
    long countBySessionId(String sessionId);

    /**
     * 删除某会话的全部消息。
     */
    void deleteBySessionId(String sessionId);
}
