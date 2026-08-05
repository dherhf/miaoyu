package org.dherhf.gateway.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JWT 工具类，仅做 Token 解析与黑名单检查（不签发）。
 * <p>
 * 合并 ticket-service 和 agent-service 两端的优点：
 * 预计算 SecretKey（性能更好）+ 强制 issuer 校验 + Redis 黑名单。
 * Token 签发仍在 ticket-service。
 */
@Component
@RequiredArgsConstructor
public class JwtUtil {

    private static final String TOKEN_BLACKLIST_PREFIX = "token:blacklist:";

    @Value("${jwt.current-secret}")
    private String currentSecret;

    @Value("${jwt.old-secret:}")
    private String oldSecret;

    @Value("${jwt.issuer:miaoyu}")
    private String issuer;

    private final StringRedisTemplate redisTemplate;

    private SecretKey currentKey;
    private SecretKey oldKey;

    @jakarta.annotation.PostConstruct
    public void init() {
        currentKey = Keys.hmacShaKeyFor(currentSecret.getBytes(StandardCharsets.UTF_8));
        oldKey = (oldSecret != null && !oldSecret.isBlank())
                ? Keys.hmacShaKeyFor(oldSecret.getBytes(StandardCharsets.UTF_8))
                : null;
    }

    /**
     * 解析 JWT Token，支持双密钥轮换 + issuer 校验。
     *
     * @param token JWT 字符串
     * @return Token 中的声明集合，解析失败返回 {@code null}
     */
    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(currentKey)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            if (oldKey != null) {
                try {
                    return Jwts.parser()
                            .verifyWith(oldKey)
                            .requireIssuer(issuer)
                            .build()
                            .parseSignedClaims(token)
                            .getPayload();
                } catch (Exception ignored) {
                }
            }
        }
        return null;
    }

    /**
     * 检查 Token 是否在 Redis 黑名单中。
     *
     * @param token JWT 字符串
     * @return 在黑名单中返回 {@code true}
     */
    public boolean isBlacklisted(String token) {
        Boolean exists = redisTemplate.hasKey(TOKEN_BLACKLIST_PREFIX + token);
        return Boolean.TRUE.equals(exists);
    }

    /**
     * 从 Token 中提取用户/管理员 ID。
     *
     * @param claims Token 声明
     * @return 用户 ID
     */
    public Long getUserId(Claims claims) {
        return Long.parseLong(claims.get("userId", String.class));
    }

    /**
     * 从 Token 中提取类型（"user" 或 "admin"）。
     *
     * @param claims Token 声明
     * @return Token 类型
     */
    public String getType(Claims claims) {
        return claims.get("type", String.class);
    }
}
