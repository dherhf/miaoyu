package org.dherhf.order.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Schema(description = "管理员订单列表")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOrderListVO {

    @Schema(description = "订单ID")
    private Long id;

    @Schema(description = "订单号")
    private String orderNo;

    @Schema(description = "用户手机号")
    private String userPhone;

    @Schema(description = "电影名称")
    private String movieName;

    @Schema(description = "影院名称")
    private String cinemaName;

    @Schema(description = "影厅名称")
    private String hallName;

    @Schema(description = "放映日期")
    private LocalDate showDate;

    @Schema(description = "开场时间")
    private LocalTime startTime;

    @Schema(description = "座位信息")
    private String seatInfo;

    @Schema(description = "票数")
    private Integer ticketCount;

    @Schema(description = "总金额")
    private BigDecimal totalAmount;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "支付时间")
    private LocalDateTime paidAt;

    @Schema(description = "取消原因")
    private String cancelReason;
}
