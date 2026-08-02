package org.dherhf.cinema.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
