package org.dherhf.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
public class AdminOrderDetailVO {

    private Long id;
    private String orderNo;
    private String userPhone;
    private String movieName;
    private String cinemaName;
    private String hallName;
    private LocalDate showDate;
    private LocalTime startTime;
    private String seatInfo;
    private Integer ticketCount;
    private BigDecimal totalAmount;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private String cancelReason;
    private String pickupCode;
    private LocalDateTime cancelledAt;
    private List<AdminSeatVO> seats;
}
