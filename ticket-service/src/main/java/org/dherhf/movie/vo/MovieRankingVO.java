package org.dherhf.movie.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Schema(description = "电影排行")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieRankingVO {

    @Schema(description = "电影名称")
    private String movieName;

    @Schema(description = "票数")
    private Long ticketCount;

    @Schema(description = "票房")
    private BigDecimal boxOffice;

    @Schema(description = "订单数量")
    private Long orderCount;

    @Schema(description = "上座率")
    private BigDecimal occupancyRate;
}
