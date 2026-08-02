package org.dherhf.movie.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MovieRankingVO {

    private String movieName;
    private Long ticketCount;
    private BigDecimal boxOffice;
    private Long orderCount;
    private BigDecimal occupancyRate;
}
