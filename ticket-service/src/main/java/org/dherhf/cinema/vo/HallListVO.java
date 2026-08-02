package org.dherhf.cinema.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
