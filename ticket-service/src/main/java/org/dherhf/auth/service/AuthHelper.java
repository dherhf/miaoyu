package org.dherhf.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * 认证共享工具组件,提供用户与管理员认证服务共用的通用方法。
 * <p>
 * 包含登录防爆破控制与手机号脱敏处理。
 *
 * @see UserAuthService
 * @see AdminAuthService
 */
@Component
@RequiredArgsConstructor
public class AuthHelper {

    private final StringRedisTemplate redisTemplate;

    @Value("${login.max-fail-count}")
    private int maxFailCount;

    @Value("${login.lock-duration}")
    private long lockDuration;

    /**
     * 记录一次登录失败,失败计数达到阈值时锁定账号。
     *
     * @param failKey Redis 失败计数 Key,格式 {@code login:fail:{phone}}
     * @param lockKey Redis 锁定 Key,格式 {@code login:lock:{phone}}
     */
    public void recordLoginFailure(String failKey, String lockKey) {
        Long failCount = redisTemplate.opsForValue().increment(failKey);
        if (failCount != null && failCount == 1) {
            redisTemplate.expire(failKey, Duration.ofSeconds(lockDuration));
        }
        if (failCount != null && failCount >= maxFailCount) {
            redisTemplate.opsForValue().set(lockKey, "1", Duration.ofSeconds(lockDuration));
        }
    }

    /**
     * 登录成功后清除失败计数。
     *
     * @param failKey Redis 失败计数 Key,格式 {@code login:fail:{phone}}
     */
    public void clearLoginFailure(String failKey) {
        redisTemplate.delete(failKey);
    }

    /**
     * 检查账号是否已被锁定。
     *
     * @param lockKey Redis 锁定 Key,格式 {@code login:lock:{phone}}
     * @return 已锁定返回 {@code true},否则 {@code false}
     */
    public boolean isAccountLocked(String lockKey) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(lockKey));
    }

    /**
     * 手机号脱敏处理,保留前 3 位和后 4 位,中间用 {@code ****} 替代。
     *
     * @param phone 明文手机号
     * @return 脱敏后的手机号,如 {@code 138****8888}；长度不足 7 位时原样返回
     */
    public String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
