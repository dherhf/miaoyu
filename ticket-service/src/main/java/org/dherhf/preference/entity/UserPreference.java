package org.dherhf.preference.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户偏好实体类，对应数据库 user_preference 表。
 * <p>
 * 存储用户个性化的观影偏好，包括偏好影厅类型、价格区间、座位区域和偏好影片类型。
 * 偏好影片类型 {preferredMovieTypes} 通过 JacksonTypeHandler 存为 JSON。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "user_preference", autoResultMap = true)
public class UserPreference {

    /** 主键 ID，自增 */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 用户 ID */
    private Long userId;

    /** 偏好影厅类型 */
    private String preferredHallType;

    /** 偏好价格下限 */
    private BigDecimal priceMin;

    /** 偏好价格上限 */
    private BigDecimal priceMax;

    /** 偏好座位区域 */
    private String preferredSeatArea;

    /** 偏好影片类型列表，JSON 存储 */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> preferredMovieTypes;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}