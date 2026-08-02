package org.dherhf.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@TableName("orders")
public class Order {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;

    private Long userId;

    private Long scheduleId;

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

    private String cancelReason;

    private LocalDateTime createdAt;

    private LocalDateTime paidAt;

    private LocalDateTime cancelledAt;

    private LocalDateTime updatedAt;
}
