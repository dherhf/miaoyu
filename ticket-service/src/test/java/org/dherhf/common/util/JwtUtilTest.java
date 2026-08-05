package org.dherhf.common.util;

import io.jsonwebtoken.Claims;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtUtil JWT 工具类测试")
class JwtUtilTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private JwtUtil jwtUtil;

    private static final String CURRENT_SECRET = "miaoyu-ticket-service-jwt-secret-key-2026";
    private static final String OLD_SECRET = "miaoyu-old-secret-key-for-testing-2026";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtUtil, "currentSecret", CURRENT_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "oldSecret", OLD_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "userExpiration", 86400L);
        ReflectionTestUtils.setField(jwtUtil, "adminExpiration", 28800L);
        ReflectionTestUtils.setField(jwtUtil, "issuer", "miaoyu");
    }

    @Nested
    @DisplayName("generateToken")
    class GenerateTokenTest {

        @Test
        @DisplayName("生成非空 Token")
        void shouldGenerateNonEmptyToken() {
            String token = jwtUtil.generateToken(1L, "user");
            assertThat(token).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("生成的 Token 包含正确的 userId")
        void shouldContainCorrectUserId() {
            String token = jwtUtil.generateToken(123L, "user");
            Claims claims = jwtUtil.parseToken(token);
            assertThat(claims.get("userId", String.class)).isEqualTo("123");
        }

        @Test
        @DisplayName("生成的 Token 包含正确的 type")
        void shouldContainCorrectType() {
            String token = jwtUtil.generateToken(1L, "admin");
            Claims claims = jwtUtil.parseToken(token);
            assertThat(claims.get("type", String.class)).isEqualTo("admin");
        }
    }

    @Nested
    @DisplayName("parseToken")
    class ParseTokenTest {

        @Test
        @DisplayName("解析有效 Token 返回 Claims")
        void shouldParseValidToken() {
            String token = jwtUtil.generateToken(1L, "user");
            Claims claims = jwtUtil.parseToken(token);
            assertThat(claims).isNotNull();
            assertThat(claims.get("userId", String.class)).isEqualTo("1");
            assertThat(claims.get("type", String.class)).isEqualTo("user");
        }

        @Test
        @DisplayName("解析无效 Token 返回 null")
        void shouldReturnNullForInvalidToken() {
            assertThat(jwtUtil.parseToken("invalid.token.here")).isNull();
        }

        @Test
        @DisplayName("使用旧密钥签名的 Token 能用 old-secret 回退解析")
        void shouldFallbackToOldSecret() {
            ReflectionTestUtils.setField(jwtUtil, "currentSecret", OLD_SECRET);
            String token = jwtUtil.generateToken(1L, "user");
            ReflectionTestUtils.setField(jwtUtil, "currentSecret", CURRENT_SECRET);

            Claims claims = jwtUtil.parseToken(token);
            assertThat(claims).isNotNull();
            assertThat(claims.get("userId", String.class)).isEqualTo("1");
        }

        @Test
        @DisplayName("old-secret 为空时无效 Token 返回 null")
        void shouldReturnNullWhenOldSecretIsEmpty() {
            ReflectionTestUtils.setField(jwtUtil, "oldSecret", "");
            assertThat(jwtUtil.parseToken("invalid.token.here")).isNull();
        }
    }

    @Nested
    @DisplayName("blacklistToken")
    class BlacklistTokenTest {

        @Test
        @DisplayName("将有效 Token 加入黑名单")
        void shouldBlacklistValidToken() {
            String token = jwtUtil.generateToken(1L, "user");
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);

            jwtUtil.blacklistToken(token);

            verify(valueOperations).set(eq("token:blacklist:" + token), eq("1"), (Duration) any());
        }

        @Test
        @DisplayName("无效 Token 不加入黑名单")
        void shouldNotBlacklistInvalidToken() {
            jwtUtil.blacklistToken("invalid.token");
            verify(redisTemplate, never()).opsForValue();
        }
    }
}
