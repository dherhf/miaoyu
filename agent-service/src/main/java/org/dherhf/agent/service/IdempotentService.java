package org.dherhf.agent.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

/**
 * Agent 层幂等服务，基于 Redis 实现写工具调用幂等校验。
 * <p>
 * 使用 agent:idempotent:{requestId} 作为 Redis Key，缓存首次工具调用的 CardPayload 结果，
 * 重复请求直接返回缓存结果，避免对 ticket-service 的冗余 HTTP 调用。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotentService {

    private static final Duration TTL = Duration.ofMinutes(30);
    private static final String KEY_PREFIX = "agent:idempotent:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 检查请求是否已处理过，返回缓存的反序列化结果。
     *
     * @param requestId 幂等请求ID
     * @param clazz     缓存结果的类型
     * @param <T>       结果类型
     * @return 已存在返回缓存的结果，不存在返回 null
     */
    public <T> T getIfPresent(String requestId, Class<T> clazz) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + requestId);
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JacksonException e) {
            log.error("无法反序列化 requestId 的幂等缓存={}", requestId, e);
            return null;
        }
    }

    /**
     * 缓存请求结果，序列化为 JSON 字符串后存入 Redis。
     *
     * @param requestId 幂等请求ID
     * @param result    请求结果
     */
    public void put(String requestId, Object result) {
        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(KEY_PREFIX + requestId, json, TTL);
        } catch (JacksonException e) {
            log.error("无法序列化 requestId 的幂等缓存={}", requestId, e);
        }
    }
}
