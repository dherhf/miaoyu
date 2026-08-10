package org.dherhf.schedule.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Schema(description = "排片详情")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleDetailVO {

    @Schema(description = "排片ID")
    private Long id;

    @Schema(description = "电影ID")
    private Long movieId;

    @Schema(description = "电影名称")
    private String movieName;

    @Schema(description = "电影海报URL")
    private String moviePosterUrl;

    @Schema(description = "电影时长（分钟）")
    private Integer movieDuration;

    @Schema(description = "影院ID")
    private Long cinemaId;

    @Schema(description = "影院名称")
    private String cinemaName;

    @Schema(description = "影院地址")
    private String cinemaAddress;

    @Schema(description = "影厅ID")
    private Long hallId;

    @Schema(description = "影厅名称")
    private String hallName;

    @Schema(description = "影厅银幕类型")
    private String hallScreenType;

    @Schema(description = "放映日期")
    private LocalDate showDate;

    @Schema(description = "开场时间")
    private LocalTime startTime;

    @Schema(description = "散场时间")
    private LocalTime endTime;

    @Schema(description = "票价")
    private BigDecimal price;

    @Schema(description = "语言版本")
    private String languageVersion;

    @Schema(description = "总座位数")
    private Integer totalSeats;

    @Schema(description = "可用座位数")
    private Integer availableSeats;

    @Schema(description = "已售座位数")
    private Integer soldSeats;

    @Schema(description = "锁定座位数")
    private Integer lockedSeats;

    @Schema(description = "上座率")
    private Double occupancyRate;

    @Schema(description = "状态")
    private String status;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
