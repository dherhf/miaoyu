package org.dherhf.cinema.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Schema(description = "影厅座位布局 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallLayoutDTO {

    @Schema(description = "总行数")
    @NotNull(message = "总行数不能为空")
    @Min(value = 1, message = "总行数最小1")
    @Max(value = 50, message = "总行数最大50")
    private Integer totalRows;

    @Schema(description = "总列数")
    @NotNull(message = "总列数不能为空")
    @Min(value = 1, message = "总列数最小1")
    @Max(value = 50, message = "总列数最大50")
    private Integer totalCols;

    @Schema(description = "座位布局单元格列表")
    @NotEmpty(message = "座位布局不能为空")
    private List<CellDTO> cells;
}
