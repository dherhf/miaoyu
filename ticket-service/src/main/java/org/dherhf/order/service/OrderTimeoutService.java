package org.dherhf.order.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * 订单超时 Redis 键管理。
 * <p>
 * 锁座成功后写入 Redis 键 order:timeout:{orderId}（TTL=15min）,
 * 支付或取消时删除该键。定时兜底扫描由 OrderServiceImpl 执行。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderTimeoutService {

    private static final Duration TIMEOUT = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "order:timeout:";

    private final StringRedisTemplate redisTemplate;

    /**
     * 投递订单超时延迟消息（写入 Redis TTL 键）。
     *
     * @param orderId 订单ID
     */
    public void schedule(Long orderId) {
        redisTemplate.opsForValue().set(KEY_PREFIX + orderId, orderId.toString(), TIMEOUT);
        log.info("Scheduled timeout for order {}", orderId);
    }

    /**
     * 取消订单的超时任务（删除 Redis 键）。
     *
     * @param orderId 订单ID
     */
    public void cancel(Long orderId) {
        redisTemplate.delete(KEY_PREFIX + orderId);
        log.info("Cancelled timeout for order {}", orderId);
    }

}
