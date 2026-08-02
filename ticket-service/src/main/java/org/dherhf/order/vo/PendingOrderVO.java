package org.dherhf.order.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PendingOrderVO {

    private Boolean pending;
    private Long orderId;
    private String movieName;
    private String cinemaName;
    private String seatInfo;
    private BigDecimal totalAmount;
    private String status;
    private Integer remainingSeconds;
}
