package org.dherhf.schedule.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.dherhf.cinema.vo.SeatVO;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatMapVO {

    private Long scheduleId;
    private Long hallId;
    private Integer totalRows;
    private Integer totalCols;
    private Integer totalSeats;
    private Integer availableSeats;
    private java.math.BigDecimal price;
    private List<SeatVO> seats;
}
