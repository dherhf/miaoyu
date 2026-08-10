package org.dherhf.cinema.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "座位信息")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatVO {

    @Schema(description = "影厅单元格ID")
    private Long hallCellId;

    @Schema(description = "座位索引")
    private Integer seatIndex;

    @Schema(description = "行索引")
    private Integer rowIndex;

    @Schema(description = "列索引")
    private Integer colIndex;

    @Schema(description = "座位标签")
    private String seatLabel;

    @Schema(description = "座位类别")
    private String seatCategory;

    @Schema(description = "座位状态")
    private String status;
}
