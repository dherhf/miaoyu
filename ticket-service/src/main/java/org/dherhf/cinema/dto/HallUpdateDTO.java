package org.dherhf.cinema.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "影厅更新请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallUpdateDTO {

    @Schema(description = "影厅名称")
    private String name;

    @Schema(description = "银幕类型")
    private String screenType;

    @Schema(description = "影厅状态")
    private Integer status;
}
