package org.dherhf.agent.model.ticket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * 对话槽位状态（扁平结构，替代原 {@code Map<String, Object>}）。
 * <p>
 * 存储于 Redis（{@code chat:context:{sessionId}}，TTL=24h）和 MongoDB（{@code chat_sessions.slotState}）。
 * </p>
 *
 * <h3>字段来源分类</h3>
 * <ul>
 *   <li>LLM 提取：movieName, cinemaName, hallType, time, count, priceMax, negateSlot</li>
 *   <li>工具回填：movieId, cinemaId, hallId, hallName</li>
 *   <li>前端传入：schedulesId, seatIds</li>
 *   <li>系统维护：negateCount</li>
 * </ul>
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlotState implements Serializable {

    /** 影片 ID（searchMovies 回填） */
    private Long movieId;

    /** 影片名称（LLM 从用户消息提取） */
    private String movieName;

    /** 影院 ID（searchCinemas 回填） */
    private Long cinemaId;

    /** 影院名称（LLM 从用户消息提取） */
    private String cinemaName;

    /** 影厅 ID（querySessions 回填） */
    private Long hallId;

    /** 影厅类型偏好（LLM 提取，如 "IMAX"/"3D"/"杜比"） */
    private String hallType;

    /** 影厅名称（querySessions 回填） */
    private String hallName;

    /** 放映时间（LLM 提取用户自然语言后标准化为 yyyy-MM-dd HH:mm:ss） */
    private String time;

    /** 购票数量（LLM 提取，如 "两张" → 2） */
    private Integer count;

    /** 场次 ID（前端选场次后直接传入，非 LLM 提取） */
    private Long schedulesId;

    /** 座位 ID 列表（前端选座后直接传入，非 LLM 提取） */
    private List<Long> seatIds;

    /** 票价上限（LLM 提取，用户说 "太贵了" 时触发，单位：元） */
    private Integer priceMax;

    /** 连续否定次数（系统维护，LLM 不设置；≥阈值时降级为结构化追问） */
    private Integer negateCount;

    /**
     * 否定槽位标记（LLM 提取，用户修正时标记需清除的槽位名）。
     * <p>
     * 仅用于 {@code mergeSlots} 合并阶段，合并后置 null，不持久化。
     * </p>
     */
    private String negateSlot;
}
