package org.dherhf.schedule.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 场次实体类，对应数据库 schedules 表。
 * <p>
 * 一个场次表示某影片在指定影院、影厅、日期和时段的一次排片放映。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("schedules")
public class Schedule {

    /** 主键ID，自增 */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 影片ID */
    private Long movieId;

    /** 影院ID */
    private Long cinemaId;

    /** 影厅ID */
    private Long hallId;

    /** 放映日期 */
    private LocalDate showDate;

    /** 放映开始时间 */
    private LocalTime startTime;

    /** 放映结束时间 */
    private LocalTime endTime;

    /** 票价（元） */
    private BigDecimal price;

    /** 语言版本，如"国语"、"英语3D"等 */
    private String languageVersion;

    /** 总座位数 */
    private Integer totalSeats;

    /** 场次状态，对应 ScheduleStatus 枚举的 code 值 */
    private String status;

    /** 逻辑删除标志，0-未删除，1-已删除 */
    @TableLogic
    private Integer deleted;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}
