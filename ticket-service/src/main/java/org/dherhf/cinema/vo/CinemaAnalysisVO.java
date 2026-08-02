package org.dherhf.cinema.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CinemaAnalysisVO {

    private String cinemaName;
    private Long orderCount;
    private Long ticketCount;
    private BigDecimal boxOffice;
    private BigDecimal occupancyRate;
    private BigDecimal refundRate;
    private BigDecimal boxOfficeShare;
}
