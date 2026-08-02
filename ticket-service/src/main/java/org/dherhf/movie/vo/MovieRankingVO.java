package org.dherhf.movie.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieRankingVO {

    private String movieName;
    private Long ticketCount;
    private BigDecimal boxOffice;
    private Long orderCount;
    private BigDecimal occupancyRate;
}
