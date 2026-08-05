package org.dherhf.agent.enums;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * 槽位定义枚举。
 * <p>
 * 对应 System Prompt 中的槽位定义，统一管理槽位名、中文描述、是否必填、是否由系统维护等属性。
 * <br>避免在 Prompt、ContextService、OutputValidatorService 等多处重复定义。
 * </p>
 */
public enum SlotEnum {

    /** 影片 ID（searchMovies 回填） */
    MOVIE_ID("movieId", "影片 ID", false, false),

    /** 影片名称（LLM 从用户消息提取） */
    MOVIE_NAME("movieName", "影片名称", false, false),

    /** 影院 ID（searchCinemas 回填） */
    CINEMA_ID("cinemaId", "影院 ID", false, false),

    /** 影院名称（LLM 从用户消息提取） */
    CINEMA_NAME("cinemaName", "影院名称", false, false),

    /** 影厅 ID（querySessions 回填） */
    HALL_ID("hallId", "影厅 ID", false, false),

    /** 影厅类型偏好（LLM 提取，如 "IMAX"/"3D"/"杜比"） */
    HALL_TYPE("hallType", "影厅类型偏好（如\"IMAX\"、\"3D\"），可选", false, false),

    /** 影厅名称（querySessions 回填） */
    HALL_NAME("hallName", "影厅名称", false, false),

    /** 放映时间（LLM 提取用户自然语言后标准化为 yyyy-MM-dd HH:mm:ss） */
    TIME("time", "放映时间，格式 yyyy-MM-dd HH:mm:ss", false, false),

    /** 购票数量（LLM 提取） */
    COUNT("count", "购票数量", false, false),

    /** 场次 ID（前端选场次后直接传入，非 LLM 提取） */
    SCHEDULES_ID("schedulesId", "场次 ID，由前端选场次后直接提供", false, false),

    /** 座位 ID 列表（前端选座后直接传入，非 LLM 提取） */
    SEAT_IDS("seatIds", "座位 ID 列表，由前端选座后直接提供，无需 LLM 提取", false, false),

    /** 票价上限（LLM 提取，用户修正 "太贵了" 时触发，单位：元） */
    PRICE_MAX("priceMax", "票价上限（元），用户修正\"太贵了\"时提取", false, false),

    /** 否定槽位标记（LLM 提取，用户修正时标记需清除的槽位名） */
    NEGATE_SLOT("negateSlot", "否定槽位标记，用户修正时标记需清除的槽位名（如\"太贵了\"→negateSlot=priceMax）", false, false),

    /** 连续否定次数（系统维护，LLM 不设置） */
    NEGATE_COUNT("negateCount", "连续否定次数（由系统维护，LLM 不设置）", false, true);

    private final String key;
    private final String descriptionZh;
    private final boolean required;
    private final boolean systemMaintained;

    SlotEnum(String key, String descriptionZh, boolean required, boolean systemMaintained) {
        this.key = key;
        this.descriptionZh = descriptionZh;
        this.required = required;
        this.systemMaintained = systemMaintained;
    }

    /**
     * 槽位键名（JSON 中的 key，如 "movieId"、"priceMax"）。
     */
    public String getKey() {
        return key;
    }

    /**
     * 中文描述（用于提示词生成）。
     */
    public String getDescriptionZh() {
        return descriptionZh;
    }

    /**
     * 是否为必填槽位。
     */
    public boolean isRequired() {
        return required;
    }

    /**
     * 是否由系统自动维护（LLM 不应设置）。
     */
    public boolean isSystemMaintained() {
        return systemMaintained;
    }

    /**
     * 生成提示词中的槽位定义列表（格式：- key：中文描述）。
     */
    public static String toPromptList() {
        return Arrays.stream(values())
                .map(e -> "- " + e.key + "：" + e.descriptionZh)
                .collect(Collectors.joining("\n"));
    }

    /**
     * 获取所有槽位键名（用于校验、过滤等）。
     */
    public static String[] getAllKeys() {
        return Arrays.stream(values())
                .map(SlotEnum::getKey)
                .toArray(String[]::new);
    }

    /**
     * 获取所有非系统维护的槽位键名（LLM 可设置的槽位）。
     */
    public static String[] getLlmSettableKeys() {
        return Arrays.stream(values())
                .filter(e -> !e.systemMaintained)
                .map(SlotEnum::getKey)
                .toArray(String[]::new);
    }

    /**
     * 根据 key 查找枚举（不区分大小写）。
     */
    public static SlotEnum findByKey(String key) {
        if (key == null) {
            return null;
        }
        for (SlotEnum e : values()) {
            if (e.key.equalsIgnoreCase(key)) {
                return e;
            }
        }
        return null;
    }

    /**
     * 判断 key 是否为有效槽位。
     */
    public static boolean isValidKey(String key) {
        return findByKey(key) != null;
    }
}
