package org.dherhf.order.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.order.service.OrderService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/**
 * Redis keyspace notification 配置：监听 key 过期事件，
 * 配合 OrderTimeoutService 的 TTL 键实现精确定时取消。
 * 定时扫表（scanTimeoutOrders）仍作为兜底。
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class OrderTimeoutRedisConfig {

    private static final String EXPIRED_TOPIC = "__keyevent@*__:expired";
    private static final String TIMEOUT_KEY_PREFIX = "order:timeout:";

    private final StringRedisTemplate redisTemplate;

    @Bean
    public RedisMessageListenerContainer orderTimeoutListenerContainer(
            RedisConnectionFactory connectionFactory,
            OrderService orderService) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        MessageListener listener = (message, pattern) -> {
            String expiredKey = new String(message.getBody());
            if (!expiredKey.startsWith(TIMEOUT_KEY_PREFIX)) {
                return;
            }
            try {
                Long orderId = Long.parseLong(expiredKey.substring(TIMEOUT_KEY_PREFIX.length()));
                log.info("Redis keyspace expired event for order {}", orderId);
                orderService.timeoutCancel(orderId);
            } catch (NumberFormatException e) {
                log.warn("Invalid orderId in expired key: {}", expiredKey);
            } catch (Exception e) {
                log.error("Error handling order timeout for key: {}", expiredKey, e);
            }
        };

        container.addMessageListener(listener, new PatternTopic(EXPIRED_TOPIC));
        return container;
    }

    /**
     * 应用启动后确保 Redis 已开启 keyspace events 通知（Ex 过期事件）。
     * 阿里云 RDS 等托管 Redis 可能默认未开启。
     */
    @EventListener(ApplicationReadyEvent.class)
    public void enableKeyspaceNotifications() {
        try {
            redisTemplate.execute((RedisCallback<Void>) connection -> {
                connection.serverCommands().setConfig("notify-keyspace-events", "Ex");
                return null;
            });
            log.info("Redis keyspace notifications enabled (notify-keyspace-events Ex)");
        } catch (Exception e) {
            log.warn("Failed to enable Redis keyspace notifications, falling back to scheduled scan only: {}", e.getMessage());
        }
    }
}
