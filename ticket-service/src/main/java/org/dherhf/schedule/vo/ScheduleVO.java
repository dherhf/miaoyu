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

@Schema(description = "排片信息")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleVO {

    @Schema(description = "排片ID")
    private Long id;

    @Schema(description = "电影ID")
    private Long movieId;

    @Schema(description = "影院ID")
    private Long cinemaId;

    @Schema(description = "影厅ID")
    private Long hallId;

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

    @Schema(description = "状态")
    private String status;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;
}
