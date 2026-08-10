package org.dherhf.order.service;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.exception.BusinessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

/**
 * 动态取票码服务,基于 Redis 实现美团/猫眼式临时核销码。
 * <p>
 * 取票码不存入数据库,仅在 Redis 中按 60 秒窗口动态刷新。
 * 反向映射 TTL(70s) 大于展示 TTL(60s),确保窗口切换后有 10 秒缓冲期,
 * admin 在缓冲期内仍可验证旧码。
 */
@Service
@RequiredArgsConstructor
public class PickupCodeService {

    private static final int CODE_TTL = 60;
    private static final int VERIFY_TTL = 70;
    private static final int CODE_LENGTH = 6;
    private static final String CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * 获取或创建取票码。有有效码则返回,无则生成新码。
     *
     * @param orderId 订单 ID
     * @return 当前有效的取票码字符串
     */
    public String getOrCreateCode(Long orderId) {
        String existing = redisTemplate.opsForValue().get("pickup:order:" + orderId);
        if (existing != null) {
            return existing;
        }
        return generateCode(orderId);
    }

    /**
     * 生成新码。不删旧码,让旧码在 70s 缓冲期内自然过期。
     *
     * @param orderId 订单 ID
     * @return 新生成的取票码字符串
     * @throws BusinessException 连续 5 次碰撞均失败时抛出
     */
    public String generateCode(Long orderId) {
        for (int i = 0; i < 5; i++) {
            String code = randomCode();
            Boolean ok = redisTemplate.opsForValue().setIfAbsent(
                    "pickup:code:" + code, orderId.toString(), VERIFY_TTL, TimeUnit.SECONDS);
            if (Boolean.TRUE.equals(ok)) {
                redisTemplate.opsForValue().set(
                        "pickup:order:" + orderId, code, CODE_TTL, TimeUnit.SECONDS);
                return code;
            }
        }
        throw new BusinessException(500, "取票码生成失败");
    }

    /**
     * 验证取票码,返回 orderId。无效或过期返回 null。
     *
     * @param code 取票码字符串
     * @return 对应的订单 ID，无效或过期返回 null
     */
    public Long verifyCode(String code) {
        if (code == null || code.length() != CODE_LENGTH) {
            return null;
        }
        String v = redisTemplate.opsForValue().get("pickup:code:" + code.toUpperCase());
        return v != null ? Long.parseLong(v) : null;
    }

    /**
     * 清理取票码（检票后/取消/退款时调用）。
     *
     * @param orderId 订单 ID
     */
    public void removeCode(Long orderId) {
        String code = redisTemplate.opsForValue().get("pickup:order:" + orderId);
        if (code != null) {
            redisTemplate.delete("pickup:code:" + code);
            redisTemplate.delete("pickup:order:" + orderId);
        }
    }

    /**
     * 获取取票码实际剩余 TTL（秒）。
     *
     * @param orderId 订单 ID
     * @return 剩余有效时长（秒），Key 不存在时返回默认值 60
     */
    public int getRemainingTtl(Long orderId) {
        Long ttl = redisTemplate.getExpire("pickup:order:" + orderId, TimeUnit.SECONDS);
        return (ttl != null && ttl > 0) ? ttl.intValue() : CODE_TTL;
    }

    /**
     * 使用安全随机数生成指定位数的取票码（排除易混淆字符 I,L,O,0,1）。
     *
     * @return 6 位随机取票码字符串
     */
    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CHARSET.charAt(secureRandom.nextInt(CHARSET.length())));
        }
        return sb.toString();
    }
}
