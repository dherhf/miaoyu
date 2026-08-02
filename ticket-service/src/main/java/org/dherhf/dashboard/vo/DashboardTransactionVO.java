package org.dherhf.dashboard.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class DashboardTransactionVO {

    private TodayStats today;
    private YesterdayCompare yesterdayCompare;
    private List<TrendItem> trend;

    @Data
    public static class TodayStats {
        private Long orderCount;
        private BigDecimal transactionAmount;
        private Long ticketCount;
        private Long refundCount;
        private BigDecimal conversionRate;
        private BigDecimal avgTicketPrice;
        private Long pendingCount;
        private BigDecimal timeoutCancelRate;
    }

    @Data
    public static class YesterdayCompare {
        private BigDecimal orderCountChange;
        private BigDecimal transactionAmountChange;
        private BigDecimal ticketCountChange;
        private BigDecimal refundCountChange;
    }

    @Data
    public static class TrendItem {
        private String date;
        private Long orderCount;
        private BigDecimal transactionAmount;
    }
}
