package org.dherhf.cinema.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "影厅创建请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallCreateDTO {

    @Schema(description = "影院ID")
    @NotNull(message = "影院ID不能为空")
    private Long cinemaId;

    @Schema(description = "影厅名称")
    @NotBlank(message = "影厅名称不能为空")
    @Size(min = 1, max = 50, message = "影厅名称长度1-50字符")
    private String name;

    @Schema(description = "银幕类型,默认2D")
    @Builder.Default
    private String screenType = "2D";
}
