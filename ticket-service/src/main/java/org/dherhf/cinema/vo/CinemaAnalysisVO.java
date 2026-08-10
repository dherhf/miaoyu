package org.dherhf.cinema.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Schema(description = "影院数据分析")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CinemaAnalysisVO {

    @Schema(description = "影院名称")
    private String cinemaName;

    @Schema(description = "订单数量")
    private Long orderCount;

    @Schema(description = "票数")
    private Long ticketCount;

    @Schema(description = "票房")
    private BigDecimal boxOffice;

    @Schema(description = "上座率")
    private BigDecimal occupancyRate;

    @Schema(description = "退票率")
    private BigDecimal refundRate;

    @Schema(description = "票房占比")
    private BigDecimal boxOfficeShare;
}
