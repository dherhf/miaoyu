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

/**
 * 数据看板服务实现类。
 * <p>
 * 基于订单数据统计交易概览、影片排行和影院分析，
 * 使用 Redis 缓存（5 分钟 TTL）减少重复计算开销。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    /** 缓存过期时间：5 分钟 */
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    /** 交易概览缓存 key 前缀 */
    private static final String CACHE_TRANSACTIONS = "dashboard:transactions:";

    /** 影片排行缓存 key 前缀 */
    private static final String CACHE_MOVIES_RANKING = "dashboard:movies-ranking:";

    /** 影院分析缓存 key */
    private static final String CACHE_CINEMAS = "dashboard:cinemas:analysis";

    private final OrderMapper orderMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 查询交易概览数据。
     * <p>
     * 统计今日和昨日的订单数、票数、交易额、退票数等指标，
     * 计算环比变化率和转化率，生成最近 N 天的趋势数据。
     * 结果优先从 Redis 缓存读取。
     *
     * @param period 时间范围（7 或 30 天）
     * @return 交易概览数据
     */
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

    /**
     * 查询影片排行。
     * <p>
     * 按影片名称分组统计已支付订单的票数、票房和订单数，
     * 支持按票房、票数或订单数排序。结果优先从 Redis 缓存读取。
     *
     * @param sortBy 排序字段（boxOffice/ticketCount/orderCount）
     * @return 影片排行列表
     */
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

    /**
     * 查询影院分析数据。
     * <p>
     * 按影院名称分组统计已支付订单的票房、订单数、票数，
     * 计算票房占比和退票率。结果优先从 Redis 缓存读取。
     *
     * @return 影院分析列表
     */
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

    /**
     * 查询指定时间范围内已支付的订单列表。
     *
     * @param start 开始时间（含）
     * @param end   结束时间（不含）
     * @return 已支付订单列表
     */
    private List<Order> getPaidOrdersByDateRange(LocalDateTime start, LocalDateTime end) {
        return orderMapper.selectList(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, "paid")
                        .ge(Order::getPaidAt, start)
                        .lt(Order::getPaidAt, end));
    }

    /**
     * 查询所有已支付订单。
     *
     * @return 已支付订单列表
     */
    private List<Order> getAllPaidOrders() {
        return orderMapper.selectList(
                new LambdaQueryWrapper<Order>().eq(Order::getStatus, "paid"));
    }

    /**
     * 查询指定日期的退票（取消）订单数。
     *
     * @param date 日期
     * @return 退票订单数
     */
    private long getRefundCountByDate(LocalDate date) {
        return orderMapper.selectCount(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, "cancelled")
                        .ge(Order::getCancelledAt, date.atStartOfDay())
                        .lt(Order::getCancelledAt, date.plusDays(1).atStartOfDay()));
    }

    /**
     * 查询指定日期的订单总数（含所有状态）。
     *
     * @param date 日期
     * @return 订单总数
     */
    private long getTotalCountByDate(LocalDate date) {
        return orderMapper.selectCount(
                new LambdaQueryWrapper<Order>()
                        .ge(Order::getCreatedAt, date.atStartOfDay())
                        .lt(Order::getCreatedAt, date.plusDays(1).atStartOfDay()));
    }

    /**
     * 查询当前待支付订单数。
     *
     * @return 待支付订单数
     */
    private long getPendingCount() {
        return orderMapper.selectCount(
                new LambdaQueryWrapper<Order>().eq(Order::getStatus, "pending"));
    }

    /**
     * 计算订单总金额。
     *
     * @param orders 订单列表
     * @return 总金额
     */
    private BigDecimal sum(List<Order> orders) {
        return orders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * 计算支付转化率（已支付订单数 / 总订单数）。
     *
     * @param paidCount  已支付订单数
     * @param totalCount 总订单数
     * @return 转化率（0-1 之间，保留 4 位小数）
     */
    private BigDecimal calcConversionRate(int paidCount, long totalCount) {
        if (totalCount == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(paidCount)
                .divide(BigDecimal.valueOf(totalCount), 4, RoundingMode.HALF_UP);
    }

    /**
     * 计算平均票价（总金额 / 总票数）。
     *
     * @param ticketCount 票数
     * @param amount     总金额
     * @return 平均票价（保留 2 位小数）
     */
    private BigDecimal calcAvgTicketPrice(long ticketCount, BigDecimal amount) {
        if (ticketCount == 0) return BigDecimal.ZERO;
        return amount.divide(BigDecimal.valueOf(ticketCount), 2, RoundingMode.HALF_UP);
    }

    /**
     * 计算超时取消率（当日退票数 / 当日总订单数）。
     *
     * @param date 日期
     * @return 超时取消率（保留 4 位小数）
     */
    private BigDecimal calcTimeoutCancelRate(LocalDate date) {
        long cancelled = getRefundCountByDate(date);
        long total = getTotalCountByDate(date);
        if (total == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(cancelled)
                .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP);
    }

    /**
     * 计算指定影院的退票率（退票数 / (已支付 + 退票)）。
     *
     * @param cinemaName 影院名称
     * @return 退票率（保留 4 位小数）
     */
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

    /**
     * 计算环比变化率（(今日 - 昨日) / 昨日）。
     *
     * @param today     今日数值
     * @param yesterday 昨日数值
     * @return 环比变化率（保留 4 位小数）
     */
    private BigDecimal calcChange(Number today, Number yesterday) {
        BigDecimal t = new BigDecimal(today.toString());
        BigDecimal y = new BigDecimal(yesterday.toString());
        if (y.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return t.subtract(y)
                .divide(y, 4, RoundingMode.HALF_UP);
    }

    /**
     * 从 Redis 缓存读取单个对象。
     *
     * @param key   缓存 key
     * @param clazz 目标类型
     * @param <T>   泛型类型
     * @return 缓存对象，不存在或反序列化失败时返回 null
     */
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

    /**
     * 从 Redis 缓存读取列表对象。
     *
     * @param key   缓存 key
     * @param clazz 列表元素类型
     * @param <T>   泛型类型
     * @return 缓存列表，不存在或反序列化失败时返回 null
     */
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

    /**
     * 将对象序列化后写入 Redis 缓存，设置 5 分钟 TTL。
     *
     * @param key   缓存 key
     * @param value 缓存对象
     */
    private void putToCache(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), CACHE_TTL);
        } catch (Exception e) {
            log.warn("Failed to write cache {}: {}", key, e.getMessage());
        }
    }
}
