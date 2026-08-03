package org.dherhf.agent.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JWT 工具类，复用 ticket-service 的密钥体系，仅做解析（不签发）。
 * <p>
 * agent-service 自身不签发 Token，Token 由 ticket-service 签发，
 * 此处仅做解析校验，拿到 userId / 用户身份后用于会话归属判定。
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
            @Value("${jwt.issuer}") String issuer) {
        this.currentKey = Keys.hmacShaKeyFor(currentSecret.getBytes(StandardCharsets.UTF_8));
        this.oldKey = oldSecret != null && !oldSecret.isBlank()
                ? Keys.hmacShaKeyFor(oldSecret.getBytes(StandardCharsets.UTF_8))
                : null;
        this.issuer = issuer;
    }

    /**
     * 从请求头 Authorization 中解析出 userId。
     * 格式：Bearer &lt;JWT&gt;
     *
     * @return userId；解析失败或 Token 无效返回 null
     */
    public Long resolveUserId(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return null;
        }
        return parseUserId(token);
    }

    public String resolveToken(HttpServletRequest request) {
        return extractToken(request);
    }

    private String extractToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            return null;
        }
        String token = auth.substring(7).trim();
        if (token.isEmpty()) {
            return null;
        }
        return token;
    }

    /**
     * 解析 JWT 中的 userId。
     * 先用 currentKey 验签，失败后 fallback oldKey。
     */
    public Long parseUserId(String token) {
        try {
            Jws<Claims> jws = Jwts.parser()
                    .verifyWith(currentKey)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token);
            Object uid = jws.getPayload().get("userId");
            if (uid == null) {
                uid = jws.getPayload().get("uid");
            }
            if (uid == null) {
                return null;
            }
            return Long.valueOf(uid.toString());
        } catch (Exception ex) {
            // 尝试旧密钥
            if (oldKey != null) {
                try {
                    Jws<Claims> jws = Jwts.parser()
                            .verifyWith(oldKey)
                            .requireIssuer(issuer)
                            .build()
                            .parseSignedClaims(token);
                    Object uid = jws.getPayload().get("userId");
                    if (uid == null) {
                        uid = jws.getPayload().get("uid");
                    }
                    return uid == null ? null : Long.valueOf(uid.toString());
                } catch (Exception ignored) {
                    return null;
                }
            }
            return null;
        }
    }
}
