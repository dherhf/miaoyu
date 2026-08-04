package org.dherhf.agent.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JWT 解析工具（只读），复用 ticket-service 的密钥体系，仅做解析（不签发）。
 * <p>
 * agent-service 自身不签发 Token，Token 由 ticket-service 签发，
 * 此处仅做解析校验，拿到 userId 后用于会话归属判定。
 * </p>
 */
@Component
public class JwtUtil {

    private final SecretKey currentKey;
    private final SecretKey oldKey;
    private final String issuer;

    public JwtUtil(
            @Value("${jwt.current-secret}") String currentSecret,
            @Value("${jwt.old-secret:}") String oldSecret,
            @Value("${jwt.issuer:miaoyu}") String issuer) {
        this.currentKey = Keys.hmacShaKeyFor(currentSecret.getBytes(StandardCharsets.UTF_8));
        this.oldKey = oldSecret != null && !oldSecret.isBlank()
                ? Keys.hmacShaKeyFor(oldSecret.getBytes(StandardCharsets.UTF_8))
                : null;
        this.issuer = issuer;
    }

    /**
     * 解析 JWT，支持双密钥轮换。失败返回 null。
     */
    public Claims parseToken(String token) {
        try {
            return parseWithSecret(token, currentKey);
        } catch (Exception e) {
            if (oldKey != null) {
                try {
                    return parseWithSecret(token, oldKey);
                } catch (Exception ignored) {
                }
            }
            return null;
        }
    }

    private Claims parseWithSecret(String token, SecretKey key) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    /**
     * 从 Token 中提取 userId。解析失败返回 null。
     */
    public Long getUserId(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return null;
        }
        Object uid = claims.get("userId");
        if (uid == null) {
            uid = claims.get("uid");
        }
        return uid == null ? null : Long.valueOf(uid.toString());
    }
}
