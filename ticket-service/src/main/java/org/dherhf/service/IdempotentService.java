package org.dherhf.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * 幂等服务,基于 Redis 实现请求幂等校验。
 * <p>
 * 使用 idempotent:{requestId} 作为 Redis Key,缓存首次请求结果,重复请求返回缓存结果。
 */
@Service
@RequiredArgsConstructor
public class IdempotentService {

    private static final Duration TTL = Duration.ofMinutes(30);
    private static final String KEY_PREFIX = "idempotent:";

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 检查请求是否已处理过。
     *
     * @param requestId 幂等请求ID
     * @return 已存在返回缓存的结果,不存在返回 null
     */
    public Object getIfPresent(String requestId) {
        return redisTemplate.opsForValue().get(KEY_PREFIX + requestId);
    }

    /**
     * 缓存请求结果。
     *
     * @param requestId 幂等请求ID
     * @param result   请求结果
     */
    public void put(String requestId, Object result) {
        redisTemplate.opsForValue().set(KEY_PREFIX + requestId, result, TTL);
    }
}
