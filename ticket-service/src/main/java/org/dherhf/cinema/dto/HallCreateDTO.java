package org.dherhf.cinema.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class HallCreateDTO {

    @NotNull(message = "影院ID不能为空")
    private Long cinemaId;

    @NotBlank(message = "影厅名称不能为空")
    @Size(min = 1, max = 50, message = "影厅名称长度1-50字符")
    private String name;

    private String screenType = "2D";
}
