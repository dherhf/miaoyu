package org.dherhf.cinema.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CellDTO {

    @NotNull(message = "行号不能为空")
    private Integer rowIndex;

    @NotNull(message = "列号不能为空")
    private Integer colIndex;

    @NotBlank(message = "单元格类型不能为空")
    private String cellType;

    private String seatLabel;

    private String seatCategory;
}
