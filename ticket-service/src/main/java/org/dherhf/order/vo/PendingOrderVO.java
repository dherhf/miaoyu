package org.dherhf.order.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Schema(description = "待支付订单")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingOrderVO {

    @Schema(description = "是否有待支付订单")
    private Boolean pending;

    @Schema(description = "订单ID")
    private Long orderId;

    @Schema(description = "电影名称")
    private String movieName;

    @Schema(description = "影院名称")
    private String cinemaName;

    @Schema(description = "座位信息")
    private String seatInfo;

    @Schema(description = "总金额")
    private BigDecimal totalAmount;

    @Schema(description = "订单状态")
    private String status;

    @Schema(description = "剩余秒数")
    private Integer remainingSeconds;
}
