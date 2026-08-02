package org.dherhf.cinema.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CinemaAnalysisVO {

    private String cinemaName;
    private Long orderCount;
    private Long ticketCount;
    private BigDecimal boxOffice;
    private BigDecimal occupancyRate;
    private BigDecimal refundRate;
    private BigDecimal boxOfficeShare;
}
