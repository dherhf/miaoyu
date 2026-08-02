package org.dherhf.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class OrderDetailVO {

    private Long id;
    private String orderNo;
    private String movieName;
    private String cinemaName;
    private String hallName;
    private LocalDate showDate;
    private LocalTime startTime;
    private String seatInfo;
    private Integer ticketCount;
    private BigDecimal totalAmount;
    private String status;
    private String pickupCode;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;
}
