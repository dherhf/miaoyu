package org.dherhf.agent.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 上下文管理服务（对应系分 §3.9.2 - 上下文管理）。
 * <p>
 * Redis 缓存 + MongoDB 双写持久化，TTL=24h。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContextService {

    private final StringRedisTemplate redisTemplate;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper;

    @Value("${agent.context-ttl-seconds}")
    private long ttlSeconds;

    @Value("${agent.history-window}")
    private int historyWindow;

    private static final String CONTEXT_KEY_PREFIX = "chat:context:";
    private static final String COLLECTION_NAME = "chat_sessions";

    // 用于缓存查询结果的键前缀
    private static final String QUERY_CACHE_PREFIX = "chat:query_cache:";

    /**
     * 从 Redis 加载槽位状态，缓存未命中时从 MongoDB 回填。
     *
     * @param sessionId 会话 ID
     * @return 槽位状态 Map；不存在时返回空 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> loadSlotState(String sessionId) {
        // 1. Redis 优先
        String key = CONTEXT_KEY_PREFIX + sessionId;
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<Map<String, Object>>() {});
            } catch (Exception ex) {
                log.warn("[loadSlotState] Redis 反序列化失败: {}", ex.getMessage());
            }
        }
        // 2. MongoDB 回填
        Query query = Query.query(Criteria.where("sessionId").is(sessionId));
        Map<String, Object> doc = mongoTemplate.findOne(
                query,
                org.bson.Document.class,
                COLLECTION_NAME
        );
        if (doc == null) {
            return new HashMap<>();
        }
        Object slotState = doc.get("slotState");
        Map<String, Object> result = slotState == null ? new HashMap<>() : (Map<String, Object>) slotState;
        // 回填 Redis
        saveToRedis(sessionId, result);
        return result;
    }

    /**
     * 更新槽位状态（Redis + MongoDB 双写）。
     *
     * @param sessionId   会话 ID
     * @param slotState   新的槽位状态
     * @param newMessage  新追加的消息对象（可 null）
     * @param lastMessageAt 最后消息时间戳
     */
    public void updateContext(
            String sessionId,
            Map<String, Object> slotState,
            Object newMessage,
            LocalDateTime lastMessageAt
    ) {
        // 1. Redis 更新
        saveToRedis(sessionId, slotState);

        // 2. MongoDB 原子更新：$set slotState + $push message
        Query query = Query.query(Criteria.where("sessionId").is(sessionId));
        Update update = new Update();
        update.set("slotState", slotState);
        if (newMessage != null) {
            update.push("messages", newMessage);
        }
        if (lastMessageAt != null) {
            update.set("lastMessageAt", lastMessageAt);
        }
        mongoTemplate.updateFirst(query, update, COLLECTION_NAME);
    }

    /**
     * 仅更新槽位状态（不追加消息）。
     */
    public void updateSlotState(String sessionId, Map<String, Object> slotState) {
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
     * 已填槽位保持有效，新输入仅更新变化的槽位。
     * 对于 negate_slot，合并时先清除对应槽位旧值再写入新值。
     * </p>
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> mergeSlots(Map<String, Object> existing, Map<String, Object> incoming) {
        Map<String, Object> merged = new HashMap<>(existing);

        // 处理否定槽位
        Object negateSlot = incoming.get("negate_slot");
        if (negateSlot != null && !negateSlot.toString().isBlank()) {
            String slotName = negateSlot.toString();
            // 对于修正场景，清除旧值并写入新值
            merged.remove(slotName);
            // 更新否定计数
            int negateCount = 0;
            Object nc = merged.get("negateCount");
            if (nc instanceof Number n) {
                negateCount = n.intValue();
            }
            merged.put("negateCount", negateCount + 1);
        }

        // 合并新槽位（不覆盖已存在且非空的值，除非是新来的）
        for (Map.Entry<String, Object> entry : incoming.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (value == null || (value instanceof String s && s.isBlank())) {
                continue;
            }
            // negate_slot 和 negateCount 已在上面特殊处理
            if ("negate_slot".equals(key) || "negateCount".equals(key)) {
                continue;
            }

            // 特别处理 film 和 cinema 槽位的完整更新逻辑
            if ("film".equals(key) && value instanceof Map<?, ?> newFilmMap) {
                if (!merged.containsKey("film") || merged.get("film") == null) {
                    merged.put(key, new HashMap<>());
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> existingFilm = (Map<String, Object>) merged.get(key);
                existingFilm.putAll((Map<String, Object>) newFilmMap);
                continue;
            }

            if ("cinema".equals(key) && value instanceof Map<?, ?> newCinemaMap) {
                if (!merged.containsKey("cinema") || merged.get("cinema") == null) {
                    merged.put(key, new HashMap<>());
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> existingCinema = (Map<String, Object>) merged.get(key);
                existingCinema.putAll((Map<String, Object>) newCinemaMap);
                continue;
            }

            // 对于其他普通槽位
            if (value instanceof Map<?, ?> newMap && merged.get(key) instanceof Map<?, ?> oldMap) {
                Map<String, Object> mergedNested = new HashMap<>((Map<String, Object>) oldMap);
                mergedNested.putAll((Map<String, Object>) newMap);
                merged.put(key, mergedNested);
            } else {
                merged.put(key, value);
            }
        }

        return merged;
    }

    /**
     * 获取最近 N 轮对话消息（用于 LLM 上下文窗口）。
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRecentMessages(String sessionId) {
        Query query = Query.query(Criteria.where("sessionId").is(sessionId));
        Map<String, Object> doc = mongoTemplate.findOne(query, org.bson.Document.class, COLLECTION_NAME);
        if (doc == null) {
            return List.of();
        }
        Object messages = doc.get("messages");
        if (!(messages instanceof List<?> list)) {
            return List.of();
        }
        int from = Math.max(0, list.size() - historyWindow);
        return new ArrayList<>((List<Map<String, Object>>) (List<?>) list.subList(from, list.size()));
    }

    /**
     * 获取会话的全量消息数（用于 msgId 分配，不受 historyWindow 截断影响）。
     *
     * @param sessionId 会话 ID
     * @return 消息总数
     */
    public int getMessageCount(String sessionId) {
        Query query = Query.query(Criteria.where("sessionId").is(sessionId));
        query.fields().include("messages");
        org.bson.Document doc = mongoTemplate.findOne(query, org.bson.Document.class, COLLECTION_NAME);
        if (doc == null) {
            return 0;
        }
        Object messages = doc.get("messages");
        return messages instanceof List<?> list ? list.size() : 0;
    }

    private void saveToRedis(String sessionId, Map<String, Object> slotState) {
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

    /**
     * 缓存查询结果
     */
    public void cacheQueryResult(String key, Object result, Duration duration) {
        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(QUERY_CACHE_PREFIX + key, json, duration);
        } catch (Exception ex) {
            log.error("[cacheQueryResult] 序列化失败: key={}, error={}", key, ex.getMessage());
        }
    }

    /**
     * 获取缓存的查询结果
     */
    @SuppressWarnings("unchecked")
    public <T> T getCachedQueryResult(String key, Class<T> clazz) {
        String cached = redisTemplate.opsForValue().get(QUERY_CACHE_PREFIX + key);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, clazz);
            } catch (Exception ex) {
                log.warn("[getCachedQueryResult] Redis 反序列化失败: {}", ex.getMessage());
            }
        }
        return null;
    }

    /**
     * 清除特定查询缓存
     */
    public void clearQueryCache(String key) {
        redisTemplate.delete(QUERY_CACHE_PREFIX + key);
    }
}
