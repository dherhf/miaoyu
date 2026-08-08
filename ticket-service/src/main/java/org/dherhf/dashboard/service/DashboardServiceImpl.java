package org.dherhf.dashboard.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.cinema.vo.CinemaAnalysisVO;
import org.dherhf.dashboard.vo.DashboardTransactionVO;
import org.dherhf.movie.vo.MovieRankingVO;
import org.dherhf.order.entity.Order;
import org.dherhf.order.mapper.OrderMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);
    private static final String CACHE_TRANSACTIONS = "dashboard:transactions:";
    private static final String CACHE_MOVIES_RANKING = "dashboard:movies-ranking:";
    private static final String CACHE_CINEMAS = "dashboard:cinemas:analysis";

    private final OrderMapper orderMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public DashboardTransactionVO transactions(String period) {
        int days = "30".equals(period) ? 30 : 7;

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        List<Order> todayOrders = getPaidOrdersByDateRange(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        List<Order> yesterdayOrders = getPaidOrdersByDateRange(yesterday.atStartOfDay(), today.atStartOfDay());

        long ticketCount = todayOrders.stream().mapToLong(Order::getTicketCount).sum();
        BigDecimal transactionAmount = sum(todayOrders);

        DashboardTransactionVO.TodayStats todayStats = DashboardTransactionVO.TodayStats.builder()
                .orderCount((long) todayOrders.size())
                .transactionAmount(transactionAmount)
                .ticketCount(ticketCount)
                .refundCount(getRefundCountByDate(today))
                .conversionRate(calcConversionRate(todayOrders.size(), getTotalCountByDate(today)))
                .avgTicketPrice(calcAvgTicketPrice(ticketCount, transactionAmount))
                .pendingCount(getPendingCount())
                .timeoutCancelRate(calcTimeoutCancelRate(today))
                .build();

        BigDecimal yesAmount = sum(yesterdayOrders);
        long yesTickets = yesterdayOrders.stream().mapToLong(Order::getTicketCount).sum();
        DashboardTransactionVO.YesterdayCompare compare = DashboardTransactionVO.YesterdayCompare.builder()
                .orderCountChange(calcChange(todayOrders.size(), yesterdayOrders.size()))
                .transactionAmountChange(calcChange(transactionAmount, yesAmount))
                .ticketCountChange(calcChange(ticketCount, yesTickets))
                .refundCountChange(calcChange(getRefundCountByDate(today), getRefundCountByDate(yesterday)))
                .build();

        List<DashboardTransactionVO.TrendItem> trend = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            List<Order> dayOrders = getPaidOrdersByDateRange(date.atStartOfDay(), date.plusDays(1).atStartOfDay());
            DashboardTransactionVO.TrendItem item = DashboardTransactionVO.TrendItem.builder()
                    .date(date.format(fmt))
                    .orderCount((long) dayOrders.size())
                    .transactionAmount(sum(dayOrders))
                    .build();
            trend.add(item);
        }

        String cacheKey = CACHE_TRANSACTIONS + period;
        DashboardTransactionVO cached = getFromCache(cacheKey, DashboardTransactionVO.class);
        if (cached != null) {
            return cached;
        }

        DashboardTransactionVO result = DashboardTransactionVO.builder()
                .today(todayStats)
                .yesterdayCompare(compare)
                .trend(trend)
                .build();

        putToCache(cacheKey, result);
        return result;
    }

    @Override
    public List<MovieRankingVO> moviesRanking(String sortBy) {
        String cacheKey = CACHE_MOVIES_RANKING + sortBy;
        List<MovieRankingVO> cached = getFromCacheList(cacheKey, MovieRankingVO.class);
        if (cached != null) {
            return cached;
        }

        List<Order> paidOrders = getAllPaidOrders();
        Map<String, List<Order>> byMovie = paidOrders.stream()
                .collect(Collectors.groupingBy(Order::getMovieName));

        List<MovieRankingVO> ranking = byMovie.entrySet().stream().map(entry -> MovieRankingVO.builder()
                .movieName(entry.getKey())
                .ticketCount(entry.getValue().stream().mapToLong(Order::getTicketCount).sum())
                .boxOffice(sum(entry.getValue()))
                .orderCount((long) entry.getValue().size())
                .occupancyRate(BigDecimal.ZERO)
                .build()).collect(Collectors.toList());

        if ("boxOffice".equals(sortBy)) {
            ranking.sort((a, b) -> b.getBoxOffice().compareTo(a.getBoxOffice()));
        } else if ("ticketCount".equals(sortBy)) {
            ranking.sort((a, b) -> Long.compare(b.getTicketCount(), a.getTicketCount()));
        } else {
            ranking.sort((a, b) -> Long.compare(b.getOrderCount(), a.getOrderCount()));
        }

        putToCache(cacheKey, ranking);
        return ranking;
    }

    @Override
    public List<CinemaAnalysisVO> cinemasAnalysis() {
        List<Order> paidOrders = getAllPaidOrders();
        Map<String, List<Order>> byCinema = paidOrders.stream()
                .collect(Collectors.groupingBy(Order::getCinemaName));

        BigDecimal totalBoxOffice = sum(paidOrders);

        // Redis 看板缓存 (5min TTL)
        List<CinemaAnalysisVO> cached = getFromCacheList(CACHE_CINEMAS, CinemaAnalysisVO.class);
        if (cached != null) {
            return cached;
        }

        List<CinemaAnalysisVO> result = byCinema.entrySet().stream().map(entry -> {
            BigDecimal boxOffice = sum(entry.getValue());
            return CinemaAnalysisVO.builder()
                    .cinemaName(entry.getKey())
                    .orderCount((long) entry.getValue().size())
                    .ticketCount(entry.getValue().stream().mapToLong(Order::getTicketCount).sum())
                    .boxOffice(boxOffice)
                    .occupancyRate(BigDecimal.ZERO)
                    .refundRate(calcRefundRate(entry.getKey()))
                    .boxOfficeShare(totalBoxOffice.compareTo(BigDecimal.ZERO) > 0
                            ? boxOffice.divide(totalBoxOffice, 4, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO)
                    .build();
        }).collect(Collectors.toList());

        putToCache(CACHE_CINEMAS, result);
        return result;
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

    private <T> T getFromCache(String key, Class<T> clazz) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json != null) {
                return objectMapper.readValue(json, clazz);
            }
        } catch (Exception e) {
            log.warn("Failed to read cache {}: {}", key, e.getMessage());
        }
        return null;
    }

    private <T> List<T> getFromCacheList(String key, Class<T> clazz) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json != null) {
                return objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, clazz));
            }
        } catch (Exception e) {
            log.warn("Failed to read cache list {}: {}", key, e.getMessage());
        }
        return null;
    }

    private void putToCache(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), CACHE_TTL);
        } catch (Exception e) {
            log.warn("Failed to write cache {}: {}", key, e.getMessage());
        }
    }
}
