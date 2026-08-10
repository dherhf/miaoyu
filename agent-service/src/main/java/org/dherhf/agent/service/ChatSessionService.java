package org.dherhf.agent.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.dherhf.agent.document.ChatMessage;
import org.dherhf.agent.document.ChatSessionDocument;
import org.dherhf.agent.enums.SessionStatusEnum;
import org.dherhf.agent.repository.ChatMessageRepository;
import org.dherhf.agent.repository.ChatSessionRepository;

/**
 * 对话会话管理服务。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatSessionService {

    private final ChatSessionRepository repository;
    private final ChatMessageRepository chatMessageRepository;
    private final MongoTemplate mongoTemplate;
    private final ContextService contextService;

    /**
     * 创建新会话。
     *
     * @param userId 用户 ID
     * @param title  会话标题（可空，默认"新对话"）
     * @return 已创建的会话文档
     */
    public ChatSessionDocument createSession(Long userId, String title) {
        ChatSessionDocument session = new ChatSessionDocument();
        session.setSessionId(UUID.randomUUID().toString().replace("-", ""));
        session.setUserId(userId);
        session.setTitle(title == null || title.isBlank() ? "新对话" : title);
        session.setStatus(SessionStatusEnum.ACTIVE.getValue());
        LocalDateTime now = LocalDateTime.now();
        session.setCreatedAt(now);
        session.setLastMessageAt(now);
        return repository.save(session);
    }

    /**
     * 更新会话标题（首次消息后自动生成）。
     *
     * @param sessionId 会话 ID
     * @param title     新标题
     */
    public void updateTitle(String sessionId, String title) {
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("sessionId").is(sessionId)),
                new org.springframework.data.mongodb.core.query.Update().set("title", title),
                ChatSessionDocument.class
        );
    }

    /**
     * 查询会话列表（分页，按 lastMessageAt 倒序）。
     *
     * @param userId 用户 ID
     * @param page  页码（从 0 开始）
     * @param size  每页条数
     * @return 会话文档列表
     */
    public List<ChatSessionDocument> listSessions(Long userId, int page, int size) {
        Query query = Query.query(Criteria.where("userId").is(userId))
                .with(org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "lastMessageAt"))
                .skip((long) page * size)
                .limit(size);
        return mongoTemplate.find(query, ChatSessionDocument.class);
    }

    /**
     * 统计用户会话总数。
     *
     * @param userId 用户 ID
     * @return 会话总数
     */
    public long countSessions(Long userId) {
        return mongoTemplate.count(
                Query.query(Criteria.where("userId").is(userId)),
                ChatSessionDocument.class
        );
    }

    /**
     * 查询会话详情（不含消息列表，消息通过 getMessages 单独查询）。
     *
     * @param sessionId 会话 ID
     * @param userId    用户 ID（校验归属）
     * @return 会话文档 Optional；不存在或不归属当前用户时返回 empty
     */
    public Optional<ChatSessionDocument> getSession(String sessionId, Long userId) {
        return repository.findBySessionId(sessionId)
                .filter(s -> s.getUserId().equals(userId));
    }

    /**
     * 查询会话的全部消息（按 msgId 正序）。
     *
     * @param sessionId 会话 ID
     * @return 消息列表
     */
    public List<ChatMessage> getMessages(String sessionId) {
        return chatMessageRepository.findBySessionIdOrderByMsgIdAsc(sessionId);
    }

    /**
     * 删除会话（含消息和 Redis 缓存清理）。
     *
     * @param sessionId 会话 ID
     * @param userId    用户 ID（校验归属）
     * @return true=删除成功，false=会话不存在或不归属当前用户
     */
    public boolean deleteSession(String sessionId, Long userId) {
        Optional<ChatSessionDocument> opt = getSession(sessionId, userId);
        if (opt.isEmpty()) {
            return false;
        }
        mongoTemplate.remove(
                Query.query(Criteria.where("sessionId").is(sessionId)),
                ChatSessionDocument.class
        );
        chatMessageRepository.deleteBySessionId(sessionId);
        contextService.clearContext(sessionId);
        return true;
    }

    /**
     * 标记会话为已完成。
     *
     * @param sessionId 会话 ID
     */
    public void markCompleted(String sessionId) {
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("sessionId").is(sessionId)),
                new org.springframework.data.mongodb.core.query.Update()
                        .set("status", SessionStatusEnum.COMPLETED.getValue()),
                ChatSessionDocument.class
        );
    }

}
