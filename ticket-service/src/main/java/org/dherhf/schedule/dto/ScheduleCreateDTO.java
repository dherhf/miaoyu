package org.dherhf.schedule.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Schema(description = "场次创建请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleCreateDTO {

    @Schema(description = "影片ID")
    @NotNull(message = "影片ID不能为空")
    private Long movieId;

    @Schema(description = "影院ID")
    @NotNull(message = "影院ID不能为空")
    private Long cinemaId;

    @Schema(description = "影厅ID")
    @NotNull(message = "影厅ID不能为空")
    private Long hallId;

    @Schema(description = "放映日期")
    @NotNull(message = "放映日期不能为空")
    private LocalDate showDate;

    @Schema(description = "开始时间")
    @NotNull(message = "开始时间不能为空")
    private LocalTime startTime;

    @Schema(description = "结束时间")
    private LocalTime endTime;

    @Schema(description = "票价")
    @NotNull(message = "票价不能为空")
    @DecimalMin(value = "0.01", message = "票价最小0.01")
    @DecimalMax(value = "999.99", message = "票价最大999.99")
    private BigDecimal price;

    @Schema(description = "语言版本")
    @NotBlank(message = "语言版本不能为空")
    private String languageVersion;
}
