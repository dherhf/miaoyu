package org.dherhf.schedule.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Schema(description = "场次更新请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleUpdateDTO {

    @Schema(description = "影厅ID")
    private Long hallId;

    @Schema(description = "放映日期")
    private LocalDate showDate;

    @Schema(description = "开始时间")
    private LocalTime startTime;

    @Schema(description = "结束时间")
    private LocalTime endTime;

    @Schema(description = "票价")
    private BigDecimal price;

    @Schema(description = "语言版本")
    private String languageVersion;
}
