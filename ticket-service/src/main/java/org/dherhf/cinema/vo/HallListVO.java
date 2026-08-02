package org.dherhf.cinema.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class HallListVO {

    private Long id;
    private Long cinemaId;
    private String cinemaName;
    private String name;
    private String screenType;
    private Integer totalRows;
    private Integer totalCols;
    private Long seatCount;
    private Integer status;
    private LocalDateTime createdAt;
}
