package org.dherhf.cinema.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "管理员座位视图")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSeatVO {

    @Schema(description = "座位标签")
    private String seatLabel;

    @Schema(description = "座位状态")
    private String status;
}
