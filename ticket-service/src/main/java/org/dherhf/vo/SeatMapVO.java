package org.dherhf.vo;

import lombok.Data;

import java.util.List;

@Data
public class SeatMapVO {

    private Long scheduleId;
    private Long hallId;
    private Integer totalRows;
    private Integer totalCols;
    private Integer totalSeats;
    private Integer availableSeats;
    private List<SeatVO> seats;
}
