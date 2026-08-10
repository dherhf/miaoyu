package org.dherhf.schedule.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.dherhf.cinema.vo.SeatVO;

import java.math.BigDecimal;
import java.util.List;

@Schema(description = "座位图")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatMapVO {

    @Schema(description = "排片ID")
    private Long scheduleId;

    @Schema(description = "影厅ID")
    private Long hallId;

    @Schema(description = "总行数")
    private Integer totalRows;

    @Schema(description = "总列数")
    private Integer totalCols;

    @Schema(description = "总座位数")
    private Integer totalSeats;

    @Schema(description = "可用座位数")
    private Integer availableSeats;

    @Schema(description = "票价")
    private BigDecimal price;

    @Schema(description = "座位列表")
    private List<SeatVO> seats;
}
