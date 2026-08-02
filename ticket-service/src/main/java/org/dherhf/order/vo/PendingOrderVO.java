package org.dherhf.order.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
