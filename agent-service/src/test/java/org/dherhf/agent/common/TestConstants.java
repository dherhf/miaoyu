package org.dherhf.agent.common;

public final class TestConstants {
    private TestConstants() {}

    // JWT配置
    public static final String CURRENT_SECRET = "e7c75bac24ee42d980929bc7eccfa76bA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6";
    public static final String OLD_SECRET = "old-secret-key-for-testing-2026";
    public static final String ISSUER = "miaoyu";
    public static final String WRONG_ISSUER = "wrong-issuer";

    // 用户ID
    public static final Long USER_ID = 1L;
    public static final Long OTHER_USER_ID = 2L;
    public static final Long INVALID_USER_ID = -1L;

    // Token
    public static final String VALID_TOKEN = "valid-token";
    public static final String INVALID_TOKEN = "invalid.token.here";
    public static final String TAMPERED_TOKEN = "tampered.token.xxx";

    // 会话
    public static final String SESSION_ID = "test-session-123";
    public static final String API_BASE = "/api/v1/chat/sessions";

    // Redis前缀
    public static final String CONTEXT_REDIS_PREFIX = "chat:context:";
    public static final String VIOLATION_REDIS_PREFIX = "chat:violation:";

    // SSE & 上下文配置
    public static final long SSE_TIMEOUT = 60000L;
    public static final int HISTORY_MSG_WINDOW = 10;
    public static final int NEGATE_THRESHOLD = 2;
    public static final int SESSION_EXPIRE_DAYS = 30;
}
