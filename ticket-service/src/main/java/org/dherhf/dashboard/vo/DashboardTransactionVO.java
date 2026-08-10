package org.dherhf.dashboard.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Schema(description = "仪表盘交易数据")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardTransactionVO {

    @Schema(description = "今日统计")
    private TodayStats today;

    @Schema(description = "昨日对比")
    private YesterdayCompare yesterdayCompare;

    @Schema(description = "趋势数据")
    private List<TrendItem> trend;

    @Schema(description = "今日统计")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TodayStats {

        @Schema(description = "订单数量")
        private Long orderCount;

        @Schema(description = "交易金额")
        private BigDecimal transactionAmount;

        @Schema(description = "票数")
        private Long ticketCount;

        @Schema(description = "退款数量")
        private Long refundCount;

        @Schema(description = "转化率")
        private BigDecimal conversionRate;

        @Schema(description = "平均票价")
        private BigDecimal avgTicketPrice;

        @Schema(description = "待支付数量")
        private Long pendingCount;

        @Schema(description = "超时取消率")
        private BigDecimal timeoutCancelRate;
    }

    @Schema(description = "昨日对比")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class YesterdayCompare {

        @Schema(description = "订单数量变化")
        private BigDecimal orderCountChange;

        @Schema(description = "交易金额变化")
        private BigDecimal transactionAmountChange;

        @Schema(description = "票数变化")
        private BigDecimal ticketCountChange;

        @Schema(description = "退款数量变化")
        private BigDecimal refundCountChange;
    }

    @Schema(description = "趋势项")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendItem {

        @Schema(description = "日期")
        private String date;

        @Schema(description = "订单数量")
        private Long orderCount;

        @Schema(description = "交易金额")
        private BigDecimal transactionAmount;
    }
}
