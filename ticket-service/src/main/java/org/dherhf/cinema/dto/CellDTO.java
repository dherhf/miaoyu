package org.dherhf.cinema.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "影厅座位布局单元格 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CellDTO {

    @Schema(description = "行号")
    @NotNull(message = "行号不能为空")
    private Integer rowIndex;

    @Schema(description = "列号")
    @NotNull(message = "列号不能为空")
    private Integer colIndex;

    @Schema(description = "单元格类型")
    @NotBlank(message = "单元格类型不能为空")
    private String cellType;

    @Schema(description = "座位标签")
    private String seatLabel;

    @Schema(description = "座位分类")
    private String seatCategory;
}
