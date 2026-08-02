package org.dherhf.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class HallDetailVO {

    private Long id;
    private Long cinemaId;
    private String name;
    private String screenType;
    private Integer totalRows;
    private Integer totalCols;
    private Integer status;
    private LocalDateTime createdAt;
    private List<CellItemVO> cells;
}
