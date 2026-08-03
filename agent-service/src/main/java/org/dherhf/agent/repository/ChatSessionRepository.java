package org.dherhf.agent.repository;

import org.dherhf.agent.document.ChatSessionDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/**
 * 对话会话 MongoDB Repository。
 */
public interface ChatSessionRepository extends MongoRepository<ChatSessionDocument, String> {

    Optional<ChatSessionDocument> findBySessionId(String sessionId);
}
