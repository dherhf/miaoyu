package org.dherhf.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 工具类,负责 Token 的生成、解析与黑名单管理。
 * <p>
 * 使用 JJWT 0.13.0 + HS256 签名算法,支持双密钥轮换（current-secret + old-secret）。
 * Token 中直接携带 {@code userId} 和 {@code type}（"user" 或 "admin"）声明,
 * 退出登录时将 Token 加入 Redis 黑名单实现主动失效。
 *
 * @see org.dherhf.interceptor.AuthInterceptor
 */
@Component
@RequiredArgsConstructor
public class JwtUtil {

    private static final String TOKEN_BLACKLIST_PREFIX = "token:blacklist:";

    @Value("${jwt.current-secret}")
    private String currentSecret;

    @Value("${jwt.old-secret:}")
    private String oldSecret;

    @Value("${jwt.user-expiration}")
    private long userExpiration;

    @Value("${jwt.admin-expiration}")
    private long adminExpiration;

    @Value("${jwt.issuer:miaoyu}")
    private String issuer;

    private final StringRedisTemplate redisTemplate;

    private SecretKey getKey(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 生成 JWT Token,将 userId 和 type 作为自定义声明写入。
     *
     * @param userId 用户或管理员 ID
     * @param type   Token 类型,{@code "user"} 或 {@code "admin"},决定有效期长短
     * @return 签名后的 JWT 字符串
     */
    public String generateToken(Long userId, String type) {
        long expiration = "admin".equals(type) ? adminExpiration : userExpiration;

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("type", type);

        return Jwts.builder()
                .claims(claims)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration * 1000))
                .issuer(issuer)
                .signWith(getKey(currentSecret))
                .compact();
    }

    /**
     * 解析 JWT Token,支持双密钥轮换：先用 current-secret,失败后回退到 old-secret。
     *
     * @param token JWT 字符串
     * @return Token 中的声明集合,解析失败返回 {@code null}
     */
    public Claims parseToken(String token) {
        try {
            return parseWithSecret(token, currentSecret);
        } catch (Exception e) {
            if (oldSecret != null && !oldSecret.isBlank()) {
                try {
                    return parseWithSecret(token, oldSecret);
                } catch (Exception ignored) {
                }
            }
        }
        return null;
    }

    private Claims parseWithSecret(String token, String secret) {
        SecretKey key = getKey(secret);
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 校验 Token 是否有效：未在黑名单中且签名解析成功。
     *
     * @param token JWT 字符串
     * @return 有效返回 {@code true},否则 {@code false}
     */
    public boolean isTokenValid(String token) {
        Boolean isBlacklisted = redisTemplate.hasKey(TOKEN_BLACKLIST_PREFIX + token);
        if (Boolean.TRUE.equals(isBlacklisted)) {
            return false;
        }
        return parseToken(token) != null;
    }

    /**
     * 将 Token 加入 Redis 黑名单,使其立即失效。
     * <p>
     * 黑名单 TTL 设置为 Token 剩余有效期,过期后自动清理。
     *
     * @param token JWT 字符串
     */
    public void blacklistToken(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return;
        }
        long remainingMs = claims.getExpiration().getTime() - System.currentTimeMillis();
        if (remainingMs > 0) {
            redisTemplate.opsForValue().set(TOKEN_BLACKLIST_PREFIX + token, "1",
                    Duration.ofMillis(remainingMs));
        }
    }

    /**
     * 从 Token 中提取用户/管理员 ID。
     *
     * @param token JWT 字符串
     * @return 用户 ID,解析失败返回 {@code null}
     */
    public Long getUserId(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return null;
        }
        return Long.parseLong(claims.get("userId", String.class));
    }

    /**
     * 从 Token 中提取类型（"user" 或 "admin"）。
     *
     * @param token JWT 字符串
     * @return Token 类型,解析失败返回 {@code null}
     */
    public String getType(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return null;
        }
        return claims.get("type", String.class);
    }
}
