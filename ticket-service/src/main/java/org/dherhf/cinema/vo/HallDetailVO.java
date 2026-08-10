package org.dherhf.cinema.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "影厅详情")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallDetailVO {

    @Schema(description = "影厅ID")
    private Long id;

    @Schema(description = "影院ID")
    private Long cinemaId;

    @Schema(description = "影厅名称")
    private String name;

    @Schema(description = "银幕类型")
    private String screenType;

    @Schema(description = "总行数")
    private Integer totalRows;

    @Schema(description = "总列数")
    private Integer totalCols;

    @Schema(description = "状态")
    private Integer status;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "座位布局单元格列表")
    private List<CellItemVO> cells;
}
