package org.dherhf.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class PayResultVO {

    private Long id;
    private String orderNo;
    private String status;
    private String pickupCode;
    private String movieName;
    private String cinemaName;
    private String cinemaAddress;
    private String hallName;
    private LocalDate showDate;
    private LocalTime startTime;
    private String seatInfo;
    private BigDecimal totalAmount;
}
