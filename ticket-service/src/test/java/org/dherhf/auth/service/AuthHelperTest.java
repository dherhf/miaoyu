package org.dherhf.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthHelper 认证共享工具测试")
class AuthHelperTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private AuthHelper authHelper;

    private static final int MAX_FAIL_COUNT = 5;
    private static final long LOCK_DURATION = 900L;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authHelper, "maxFailCount", MAX_FAIL_COUNT);
        ReflectionTestUtils.setField(authHelper, "lockDuration", LOCK_DURATION);
    }

    @Nested
    @DisplayName("maskPhone")
    class MaskPhoneTest {

        @Test
        @DisplayName("标准手机号脱敏为 138****8000")
        void shouldMaskStandardPhone() {
            assertThat(authHelper.maskPhone("13800138000")).isEqualTo("138****8000");
        }

        @Test
        @DisplayName("短于 7 位的手机号原样返回")
        void shouldReturnShortPhoneAsIs() {
            assertThat(authHelper.maskPhone("12345")).isEqualTo("12345");
        }

        @Test
        @DisplayName("null 原样返回")
        void shouldReturnNullAsIs() {
            assertThat(authHelper.maskPhone(null)).isNull();
        }
    }

    @Nested
    @DisplayName("isAccountLocked")
    class IsAccountLockedTest {

        @Test
        @DisplayName("Redis 中存在锁 Key 返回 true")
        void shouldReturnTrueWhenLocked() {
            when(redisTemplate.hasKey("login:lock:abc")).thenReturn(true);
            assertThat(authHelper.isAccountLocked("login:lock:abc")).isTrue();
        }

        @Test
        @DisplayName("Redis 中不存在锁 Key 返回 false")
        void shouldReturnFalseWhenNotLocked() {
            when(redisTemplate.hasKey("login:lock:abc")).thenReturn(false);
            assertThat(authHelper.isAccountLocked("login:lock:abc")).isFalse();
        }
    }

    @Nested
    @DisplayName("recordLoginFailure")
    class RecordLoginFailureTest {

        @Test
        @DisplayName("首次失败时设置失败计数 TTL")
        void shouldSetTtlOnFirstFailure() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.increment("login:fail:abc")).thenReturn(1L);

            authHelper.recordLoginFailure("login:fail:abc", "login:lock:abc");

            verify(redisTemplate).expire("login:fail:abc", Duration.ofSeconds(LOCK_DURATION));
            verify(valueOperations, never()).set(anyString(), anyString(), (Duration) any());
        }

        @Test
        @DisplayName("失败次数达到阈值时锁定账号")
        void shouldLockAccountAtMaxFailures() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.increment("login:fail:abc")).thenReturn((long) MAX_FAIL_COUNT);

            authHelper.recordLoginFailure("login:fail:abc", "login:lock:abc");

            verify(valueOperations).set(eq("login:lock:abc"), eq("1"), eq(Duration.ofSeconds(LOCK_DURATION)));
            verify(redisTemplate, never()).expire(anyString(), (Duration) any());
        }

        @Test
        @DisplayName("中间次数失败不锁定也不设置 TTL")
        void shouldNotLockOrSetTtlForMiddleCount() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.increment("login:fail:abc")).thenReturn(3L);

            authHelper.recordLoginFailure("login:fail:abc", "login:lock:abc");

            verify(redisTemplate, never()).expire(anyString(), (Duration) any());
            verify(valueOperations, never()).set(anyString(), anyString(), (Duration) any());
        }
    }

    @Nested
    @DisplayName("clearLoginFailure")
    class ClearLoginFailureTest {

        @Test
        @DisplayName("删除失败计数 Key")
        void shouldDeleteFailKey() {
            authHelper.clearLoginFailure("login:fail:abc");
            verify(redisTemplate).delete("login:fail:abc");
        }
    }
}
