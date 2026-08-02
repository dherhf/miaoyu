package org.dherhf.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.entity.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * 订单超时取消服务,基于 Redis 过期键 + 定时兜底实现。
 * <p>
 * 锁座成功后写入 Redis 键 order:timeout:{orderId}（TTL=15min）,
 * 定时任务每 60 秒扫描数据库中超时未支付的 pending 订单,执行取消。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderTimeoutService {

    private static final Duration TIMEOUT = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "order:timeout:";

    private final RedisTemplate<String, Object> redisTemplate;
    private final OrderService orderService;

    /**
     * 投递订单超时延迟消息（写入 Redis TTL 键）。
     *
     * @param orderId 订单ID
     */
    public void schedule(Long orderId) {
        redisTemplate.opsForValue().set(KEY_PREFIX + orderId, orderId, TIMEOUT);
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

    /**
     * 定时兜底:每 60 秒扫描数据库中创建超过 15 分钟仍为 pending 的订单,
     * 执行超时取消。
     */
    @Scheduled(fixedRate = 60000)
    public void scanTimeoutOrders() {
        LocalDateTime deadline = LocalDateTime.now().minusSeconds(TIMEOUT.getSeconds());
        // 通过 OrderService 查询超时待支付订单并取消
        orderService.cancelTimeoutOrders(deadline);
    }
}
