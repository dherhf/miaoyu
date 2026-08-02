package org.dherhf.cinema.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class HallVO {

    private Long id;
    private Long cinemaId;
    private String name;
    private String screenType;
    private Integer totalRows;
    private Integer totalCols;
    private Integer status;
    private LocalDateTime createdAt;
}
