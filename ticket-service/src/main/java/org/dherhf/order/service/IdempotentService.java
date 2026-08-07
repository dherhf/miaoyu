package org.dherhf.order.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

/**
 * 幂等服务,基于 Redis 实现请求幂等校验。
 * <p>
 * 使用 idempotent:{requestId} 作为 Redis Key,缓存首次请求结果,重复请求返回缓存结果。
 * Redis 中仅存储纯 JSON 字符串,Java 业务层手动进行 JSON 与 Object 的转换。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotentService {

    private static final Duration TTL = Duration.ofMinutes(30);
    private static final String KEY_PREFIX = "idempotent:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 检查请求是否已处理过,返回缓存的反序列化结果。
     * Redis Key 绑定 userId,防止跨用户 requestId 碰撞或重放。
     *
     * @param userId    用户ID
     * @param requestId 幂等请求ID
     * @param clazz     缓存结果的类型
     * @param <T>       结果类型
     * @return 已存在返回缓存的结果,不存在返回 null
     */
    public <T> T getIfPresent(Long userId, String requestId, Class<T> clazz) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + userId + ":" + requestId);
        if (json == null) {
            return null;
        }
        if (clazz == Void.class || clazz == void.class) {
            return null;
        }
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JacksonException e) {
            log.error("无法反序列化 userId={},requestId={} 的幂等缓存", userId, requestId, e);
            return null;
        }
    }

    /**
     * 缓存请求结果,序列化为 JSON 字符串后存入 Redis。
     * Redis Key 绑定 userId,防止跨用户 requestId 碰撞或重放。
     *
     * @param userId    用户ID
     * @param requestId 幂等请求ID
     * @param result    请求结果
     */
    public void put(Long userId, String requestId, Object result) {
        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(KEY_PREFIX + userId + ":" + requestId, json, TTL);
        } catch (JacksonException e) {
            log.error("无法序列化 userId={},requestId={} 的幂等缓存", userId, requestId, e);
        }
    }
}
