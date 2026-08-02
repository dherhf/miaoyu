package org.dherhf.dashboard.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dherhf.cinema.vo.CinemaAnalysisVO;
import org.dherhf.dashboard.vo.DashboardTransactionVO;
import org.dherhf.movie.vo.MovieRankingVO;
import org.dherhf.common.result.Result;
import org.dherhf.order.entity.Order;
import org.dherhf.order.mapper.OrderMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final OrderMapper orderMapper;
    private final ScheduleMapper scheduleMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;

    @Override
    public Result<DashboardTransactionVO> transactions(String period) {
        int days = "30".equals(period) ? 30 : 7;

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        List<Order> todayOrders = getPaidOrdersByDateRange(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        List<Order> yesterdayOrders = getPaidOrdersByDateRange(yesterday.atStartOfDay(), today.atStartOfDay());

        DashboardTransactionVO vo = new DashboardTransactionVO();

        DashboardTransactionVO.TodayStats todayStats = new DashboardTransactionVO.TodayStats();
        todayStats.setOrderCount((long) todayOrders.size());
        todayStats.setTransactionAmount(sum(todayOrders));
        todayStats.setTicketCount(todayOrders.stream().mapToLong(Order::getTicketCount).sum());
        todayStats.setRefundCount(getRefundCountByDate(today));
        todayStats.setConversionRate(calcConversionRate(todayOrders.size(), getTotalCountByDate(today)));
        todayStats.setAvgTicketPrice(calcAvgTicketPrice(todayStats.getTicketCount(), todayStats.getTransactionAmount()));
        todayStats.setPendingCount(getPendingCount());
        todayStats.setTimeoutCancelRate(calcTimeoutCancelRate(today));
        vo.setToday(todayStats);

        DashboardTransactionVO.YesterdayCompare compare = new DashboardTransactionVO.YesterdayCompare();
        BigDecimal yesAmount = sum(yesterdayOrders);
        long yesTickets = yesterdayOrders.stream().mapToLong(Order::getTicketCount).sum();
        compare.setOrderCountChange(calcChange(todayOrders.size(), yesterdayOrders.size()));
        compare.setTransactionAmountChange(calcChange(todayStats.getTransactionAmount(), yesAmount));
        compare.setTicketCountChange(calcChange(todayStats.getTicketCount(), yesTickets));
        compare.setRefundCountChange(calcChange(getRefundCountByDate(today), getRefundCountByDate(yesterday)));
        vo.setYesterdayCompare(compare);

        List<DashboardTransactionVO.TrendItem> trend = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            List<Order> dayOrders = getPaidOrdersByDateRange(date.atStartOfDay(), date.plusDays(1).atStartOfDay());
            DashboardTransactionVO.TrendItem item = new DashboardTransactionVO.TrendItem();
            item.setDate(date.format(fmt));
            item.setOrderCount((long) dayOrders.size());
            item.setTransactionAmount(sum(dayOrders));
            trend.add(item);
        }
        vo.setTrend(trend);

        // TODO: Redis 看板缓存 (5min TTL)
        return Result.success(vo);
    }

    @Override
    public Result<List<MovieRankingVO>> moviesRanking(String sortBy) {
        List<Order> paidOrders = getAllPaidOrders();
        Map<String, List<Order>> byMovie = paidOrders.stream()
                .collect(Collectors.groupingBy(Order::getMovieName));

        List<MovieRankingVO> ranking = byMovie.entrySet().stream().map(entry -> {
            MovieRankingVO vo = new MovieRankingVO();
            vo.setMovieName(entry.getKey());
            vo.setTicketCount(entry.getValue().stream().mapToLong(Order::getTicketCount).sum());
            vo.setBoxOffice(sum(entry.getValue()));
            vo.setOrderCount((long) entry.getValue().size());
            // TODO: query schedule seat data
            vo.setOccupancyRate(BigDecimal.ZERO);
            return vo;
        }).collect(Collectors.toList());

        if ("boxOffice".equals(sortBy)) {
            ranking.sort((a, b) -> b.getBoxOffice().compareTo(a.getBoxOffice()));
        } else if ("ticketCount".equals(sortBy)) {
            ranking.sort((a, b) -> Long.compare(b.getTicketCount(), a.getTicketCount()));
        } else {
            ranking.sort((a, b) -> Long.compare(b.getOrderCount(), a.getOrderCount()));
        }

        return Result.success(ranking);
    }

    @Override
    public Result<List<CinemaAnalysisVO>> cinemasAnalysis() {
        List<Order> paidOrders = getAllPaidOrders();
        Map<String, List<Order>> byCinema = paidOrders.stream()
                .collect(Collectors.groupingBy(Order::getCinemaName));

        BigDecimal totalBoxOffice = sum(paidOrders);

        List<CinemaAnalysisVO> analysis = byCinema.entrySet().stream().map(entry -> {
            CinemaAnalysisVO vo = new CinemaAnalysisVO();
            vo.setCinemaName(entry.getKey());
            vo.setOrderCount((long) entry.getValue().size());
            vo.setTicketCount(entry.getValue().stream().mapToLong(Order::getTicketCount).sum());
            BigDecimal boxOffice = sum(entry.getValue());
            vo.setBoxOffice(boxOffice);
            // TODO: Redis 看板缓存
            vo.setOccupancyRate(BigDecimal.ZERO);
            vo.setRefundRate(calcRefundRate(entry.getKey()));
            if (totalBoxOffice.compareTo(BigDecimal.ZERO) > 0) {
                vo.setBoxOfficeShare(boxOffice.divide(totalBoxOffice, 4, RoundingMode.HALF_UP));
            } else {
                vo.setBoxOfficeShare(BigDecimal.ZERO);
            }
            return vo;
        }).collect(Collectors.toList());

        // TODO: Redis 看板缓存 (5min TTL)
        return Result.success(analysis);
    }

    private List<Order> getPaidOrdersByDateRange(LocalDateTime start, LocalDateTime end) {
        return orderMapper.selectList(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, "paid")
                        .ge(Order::getPaidAt, start)
                        .lt(Order::getPaidAt, end));
    }

    private List<Order> getAllPaidOrders() {
        return orderMapper.selectList(
                new LambdaQueryWrapper<Order>().eq(Order::getStatus, "paid"));
    }

    private long getRefundCountByDate(LocalDate date) {
        return orderMapper.selectCount(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, "cancelled")
                        .ge(Order::getCancelledAt, date.atStartOfDay())
                        .lt(Order::getCancelledAt, date.plusDays(1).atStartOfDay()));
    }

    private long getTotalCountByDate(LocalDate date) {
        return orderMapper.selectCount(
                new LambdaQueryWrapper<Order>()
                        .ge(Order::getCreatedAt, date.atStartOfDay())
                        .lt(Order::getCreatedAt, date.plusDays(1).atStartOfDay()));
    }

    private long getPendingCount() {
        return orderMapper.selectCount(
                new LambdaQueryWrapper<Order>().eq(Order::getStatus, "pending"));
    }

    private BigDecimal sum(List<Order> orders) {
        return orders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calcConversionRate(int paidCount, long totalCount) {
        if (totalCount == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(paidCount)
                .divide(BigDecimal.valueOf(totalCount), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calcAvgTicketPrice(long ticketCount, BigDecimal amount) {
        if (ticketCount == 0) return BigDecimal.ZERO;
        return amount.divide(BigDecimal.valueOf(ticketCount), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calcTimeoutCancelRate(LocalDate date) {
        long cancelled = getRefundCountByDate(date);
        long total = getTotalCountByDate(date);
        if (total == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(cancelled)
                .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calcRefundRate(String cinemaName) {
        long paid = orderMapper.selectCount(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, "paid")
                        .eq(Order::getCinemaName, cinemaName));
        long cancelled = orderMapper.selectCount(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, "cancelled")
                        .eq(Order::getCinemaName, cinemaName));
        long total = paid + cancelled;
        if (total == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(cancelled)
                .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calcChange(Number today, Number yesterday) {
        BigDecimal t = new BigDecimal(today.toString());
        BigDecimal y = new BigDecimal(yesterday.toString());
        if (y.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return t.subtract(y)
                .divide(y, 4, RoundingMode.HALF_UP);
    }
}
