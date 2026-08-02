package org.dherhf.schedule.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ScheduleCreateDTO {

    @NotNull(message = "影片ID不能为空")
    private Long movieId;

    @NotNull(message = "影院ID不能为空")
    private Long cinemaId;

    @NotNull(message = "影厅ID不能为空")
    private Long hallId;

    @NotNull(message = "放映日期不能为空")
    private LocalDate showDate;

    @NotNull(message = "开始时间不能为空")
    private LocalTime startTime;

    private LocalTime endTime;

    @NotNull(message = "票价不能为空")
    @DecimalMin(value = "0.01", message = "票价最小0.01")
    @DecimalMax(value = "999.99", message = "票价最大999.99")
    private BigDecimal price;

    @NotBlank(message = "语言版本不能为空")
    private String languageVersion;
}
