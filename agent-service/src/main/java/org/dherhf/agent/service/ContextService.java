package org.dherhf.agent.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.dherhf.agent.document.ChatMessage;
import org.dherhf.agent.model.ticket.RequestContext;
import org.dherhf.agent.model.ticket.SlotState;
import org.dherhf.agent.repository.ChatMessageRepository;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 上下文管理服务（对应系分 §3.9.2 - 上下文管理）。
 * <p>
 * Redis 缓存 + MongoDB 双写持久化，TTL=24h。
 * </p>
 *
 * <h3>slotState 槽位结构</h3>
 * <pre>{@code
 * {
 *   "movieId": 1,            // 影片 ID（searchMovies 回填）
 *   "movieName": "流浪地球3",  // 影片名称（LLM 从用户消息提取）
 *   "cinemaId": 1,           // 影院 ID（searchCinemas 回填）
 *   "cinemaName": "万达影城IMAX", // 影院名称（LLM 从用户消息提取）
 *   "hallId": 1,             // 影厅 ID（querySessions 回填，前端选场次时确定）
 *   "hallType": "3D",        // 影厅类型偏好（LLM 提取，如 "IMAX"/"3D"/"杜比"）
 *   "hallName": "1号大厅",    // 影厅名称（querySessions 回填）
 *   "time": "yyyy-MM-dd HH:mm:ss", // 放映时间（LLM 提取用户自然语言后标准化）
 *   "count": 2,              // 购票数量（LLM 提取，如 "两张" → 2）
 *   "schedulesId": 8848,     // 场次 ID（前端选场次后直接传入，非 LLM 提取）
 *   "seatIds": [10241, 10242], // 座位 ID 列表（前端选座后直接传入，非 LLM 提取）
 *   "priceMax": 40,          // 票价上限（LLM 提取，用户说 "太贵了" 时触发，单位：元）
 *   "negateCount": 1         // 连续否定次数（系统维护，LLM 不设置；≥2 时降级为结构化追问）
 * }
 * }</pre>
 *
 * <h3>Redis 键设计</h3>
 * <ul>
 *   <li>{@code chat:context:{sessionId}} — 槽位状态缓存，TTL=24h（与 MongoDB slotState 同步）</li>
 *   <li>{@code chat:request_ctx:{sessionId}} — 单次请求上下文（userId/scheduleId/seatIds 等），TTL=5min</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContextService {

    private static final String CONTEXT_KEY_PREFIX = "chat:context:";
    private static final String COLLECTION_NAME = "chat_sessions";
    private static final String REQUEST_CTX_PREFIX = "chat:request_ctx:";
    private static final Duration REQUEST_CTX_TTL = Duration.ofMinutes(5);
    private final StringRedisTemplate redisTemplate;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper;
    private final ChatMessageRepository chatMessageRepository;
    @Value("${agent.context-ttl-seconds}")
    private long ttlSeconds;

    /**
     * 从 Redis 加载槽位状态，缓存未命中时从 MongoDB 回填。
     *
     * @param sessionId 会话 ID
     * @return 槽位状态；不存在时返回空 SlotState
     */
    public SlotState loadSlotState(String sessionId) {
        // 1. Redis 优先
        String key = CONTEXT_KEY_PREFIX + sessionId;
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, SlotState.class);
            } catch (Exception ex) {
                log.warn("[loadSlotState] Redis 反序列化失败: {}", ex.getMessage());
            }
        }
        // 2. MongoDB 回填
        Query query = Query.query(Criteria.where("sessionId").is(sessionId));
        org.bson.Document doc = mongoTemplate.findOne(query, org.bson.Document.class, COLLECTION_NAME);
        if (doc == null) {
            return new SlotState();
        }
        Object slotState = doc.get("slotState");
        if (slotState == null) {
            return new SlotState();
        }
        SlotState result;
        try {
            result = objectMapper.convertValue(slotState, SlotState.class);
        } catch (Exception ex) {
            log.warn("[loadSlotState] MongoDB 文档转换失败: {}", ex.getMessage());
            return new SlotState();
        }
        // 回填 Redis
        saveToRedis(sessionId, result);
        return result;
    }

    /**
     * 更新槽位状态并追加消息（Redis + MongoDB 双写）。
     *
     * @param sessionId     会话 ID
     * @param slotState     新的槽位状态
     * @param newMessage    新追加的消息对象（可 null）
     * @param lastMessageAt 最后消息时间戳
     */
    public void updateContext(
            String sessionId,
            SlotState slotState,
            ChatMessage newMessage,
            LocalDateTime lastMessageAt
    ) {
        // 1. Redis 更新
        saveToRedis(sessionId, slotState);

        // 2. MongoDB 会话文档：$set slotState + lastMessageAt
        Query query = Query.query(Criteria.where("sessionId").is(sessionId));
        Update update = new Update();
        update.set("slotState", slotState);
        if (lastMessageAt != null) {
            update.set("lastMessageAt", lastMessageAt);
        }
        mongoTemplate.updateFirst(query, update, COLLECTION_NAME);

        // 3. MongoDB 消息文档：独立集合写入
        if (newMessage != null) {
            newMessage.setSessionId(sessionId);
            chatMessageRepository.save(newMessage);
        }
    }

    /**
     * 仅更新槽位状态（不追加消息）。
     */
    public void updateSlotState(String sessionId, SlotState slotState) {
        saveToRedis(sessionId, slotState);
        Query query = Query.query(Criteria.where("sessionId").is(sessionId));
        Update update = new Update();
        update.set("slotState", slotState);
        mongoTemplate.updateFirst(query, update, COLLECTION_NAME);
    }

    /**
     * 清除 Redis 上下文缓存（会话删除/结束时调用）。
     */
    public void clearContext(String sessionId) {
        redisTemplate.delete(CONTEXT_KEY_PREFIX + sessionId);
    }

    /**
     * 合并新槽位到已有状态。
     * <p>
     * 已填槽位可被新输入覆写，incoming 中非 null 字段直接覆盖 existing 对应字段。
     * 对于 negateSlot，合并时先清除对应槽位旧值再将 negateCount +1。
     * </p>
     */
    public SlotState mergeSlots(SlotState existing, SlotState incoming) {
        SlotState merged = new SlotState();
        // 先复制现有状态
        copyNonNull(merged, existing);

        // 处理否定槽位
        if (incoming.getNegateSlot() != null && !incoming.getNegateSlot().isBlank()) {
            String slotName = incoming.getNegateSlot();
            clearSlotByName(merged, slotName);
            int negateCount = merged.getNegateCount() != null ? merged.getNegateCount() : 0;
            merged.setNegateCount(negateCount + 1);
        }

        // 合并新槽位（仅覆盖非 null 字段）
        copyNonNull(merged, incoming);
        // negateSlot 不持久化
        merged.setNegateSlot(null);
        return merged;
    }

    /**
     * 获取会话的全量消息数（用于 msgId 分配）。
     *
     * @param sessionId 会话 ID
     * @return 消息总数
     */
    public int getMessageCount(String sessionId) {
        return (int) chatMessageRepository.countBySessionId(sessionId);
    }

    private void saveToRedis(String sessionId, SlotState slotState) {
        try {
            String json = objectMapper.writeValueAsString(slotState);
            redisTemplate.opsForValue().set(
                    CONTEXT_KEY_PREFIX + sessionId,
                    json,
                    Duration.ofSeconds(ttlSeconds)
            );
        } catch (Exception ex) {
            log.error("[saveToRedis] 序列化失败: sessionId={}, error={}", sessionId, ex.getMessage());
        }
    }

    // ========== 请求上下文（替代原 TicketTools ThreadLocal） ==========

    /**
     * 存入单次请求上下文（userId / scheduleId / seatIds / ticketCount / requestId）。
     * 在 LLM 调用前写入，TicketTools 通过 sessionId 查询。
     */
    public void storeRequestContext(String sessionId, RequestContext ctx) {
        try {
            String json = objectMapper.writeValueAsString(ctx);
            redisTemplate.opsForValue().set(REQUEST_CTX_PREFIX + sessionId, json, REQUEST_CTX_TTL);
        } catch (Exception ex) {
            log.error("[storeRequestContext] 序列化失败: sessionId={}, error={}", sessionId, ex.getMessage());
        }
    }

    /**
     * 读取请求上下文。
     */
    public RequestContext getRequestContext(String sessionId) {
        String json = redisTemplate.opsForValue().get(REQUEST_CTX_PREFIX + sessionId);
        if (json != null) {
            try {
                return objectMapper.readValue(json, RequestContext.class);
            } catch (Exception ex) {
                log.warn("[getRequestContext] Redis 反序列化失败: {}", ex.getMessage());
            }
        }
        return null;
    }

    /**
     * 清除请求上下文（LLM 调用结束后调用）。
     */
    public void clearRequestContext(String sessionId) {
        redisTemplate.delete(REQUEST_CTX_PREFIX + sessionId);
    }

    // ========== 内部工具方法 ==========

    /**
     * 将 source 中非 null 的字段复制到 target（覆盖 target 已有值）。
     */
    private static void copyNonNull(SlotState target, SlotState source) {
        if (source == null) return;
        if (source.getMovieId() != null) target.setMovieId(source.getMovieId());
        if (source.getMovieName() != null) target.setMovieName(source.getMovieName());
        if (source.getCinemaId() != null) target.setCinemaId(source.getCinemaId());
        if (source.getCinemaName() != null) target.setCinemaName(source.getCinemaName());
        if (source.getHallId() != null) target.setHallId(source.getHallId());
        if (source.getHallType() != null) target.setHallType(source.getHallType());
        if (source.getHallName() != null) target.setHallName(source.getHallName());
        if (source.getTime() != null) target.setTime(source.getTime());
        if (source.getCount() != null) target.setCount(source.getCount());
        if (source.getSchedulesId() != null) target.setSchedulesId(source.getSchedulesId());
        if (source.getSeatIds() != null) target.setSeatIds(source.getSeatIds());
        if (source.getPriceMax() != null) target.setPriceMax(source.getPriceMax());
        if (source.getNegateCount() != null) target.setNegateCount(source.getNegateCount());
        if (source.getNegateSlot() != null) target.setNegateSlot(source.getNegateSlot());
    }

    /**
     * 按槽位名清除对应字段（用于否定场景）。
     */
    private static void clearSlotByName(SlotState state, String slotName) {
        switch (slotName) {
            case "movieId" -> state.setMovieId(null);
            case "movieName" -> state.setMovieName(null);
            case "cinemaId" -> state.setCinemaId(null);
            case "cinemaName" -> state.setCinemaName(null);
            case "hallId" -> state.setHallId(null);
            case "hallType" -> state.setHallType(null);
            case "hallName" -> state.setHallName(null);
            case "time" -> state.setTime(null);
            case "count" -> state.setCount(null);
            case "schedulesId" -> state.setSchedulesId(null);
            case "seatIds" -> state.setSeatIds(null);
            case "priceMax" -> state.setPriceMax(null);
            default -> log.warn("[clearSlotByName] 未知槽位名: {}", slotName);
        }
    }
}
