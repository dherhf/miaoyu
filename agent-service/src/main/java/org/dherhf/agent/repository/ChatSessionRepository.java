package org.dherhf.agent.repository;

import org.dherhf.agent.document.ChatSessionDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/**
 * 对话会话 MongoDB Repository。
 */
public interface ChatSessionRepository extends MongoRepository<ChatSessionDocument, String> {

    /**
     * 根据会话 ID 查询会话文档。
     *
     * @param sessionId 会话 ID
     * @return 会话文档（可能为空）
     */
    Optional<ChatSessionDocument> findBySessionId(String sessionId);
}
