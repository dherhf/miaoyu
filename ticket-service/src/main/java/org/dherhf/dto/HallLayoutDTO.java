package org.dherhf.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class HallLayoutDTO {

    @NotNull(message = "总行数不能为空")
    @Min(value = 1, message = "总行数最小1")
    @Max(value = 50, message = "总行数最大50")
    private Integer totalRows;

    @NotNull(message = "总列数不能为空")
    @Min(value = 1, message = "总列数最小1")
    @Max(value = 50, message = "总列数最大50")
    private Integer totalCols;

    @NotEmpty(message = "座位布局不能为空")
    private List<CellDTO> cells;
}
