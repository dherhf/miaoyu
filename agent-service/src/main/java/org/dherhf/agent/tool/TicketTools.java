package org.dherhf.agent.tool;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.common.ErrorCodeEnum;
import org.dherhf.agent.common.Result;
import org.dherhf.agent.model.card.CardPayload;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * LangChain4j 业务工具集，通过 @Tool 注解暴露给 LLM 进行 Function Calling。
 * <p>
 * 工具列表（对应系分 §3.9.2 关键技术设计 - 业务工具集）：
 * <ol>
 *   <li>{@link #searchMovies} - 查询影片列表</li>
 *   <li>{@link #searchCinemas} - 查询影院列表</li>
 *   <li>{@link #querySessions} - 查询场次列表</li>
 *   <li>{@link #getSeatMap} - 获取座位图</li>
 *   <li>{@link #queryOrders} - 查询用户订单</li>
 *   <li>{@link #lockAndCreateOrder} - 锁座下单</li>
 *   <li>{@link #queryOrderDetail} - 查询订单详情</li>
 * </ol>
 * </p>
 */
@Slf4j
@Component
public class TicketTools {

    private final TicketServiceClient ticketClient;

    @Autowired
    public TicketTools(TicketServiceClient ticketClient) {
        this.ticketClient = ticketClient;
    }

    // ========== ThreadLocal 上下文：当前会话的 userId ==========

    private static final ThreadLocal<Long> CURRENT_USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<Long> CURRENT_SCHEDULE_ID = new ThreadLocal<>();
    private static final ThreadLocal<List<Long>> CURRENT_SEAT_IDS = new ThreadLocal<>();

    public static void setContext(Long userId, Long scheduleId, List<Long> seatIds) {
        CURRENT_USER_ID.set(userId);
        CURRENT_SCHEDULE_ID.set(scheduleId);
        CURRENT_SEAT_IDS.set(seatIds);
    }

    public static void clearContext() {
        CURRENT_USER_ID.remove();
        CURRENT_SCHEDULE_ID.remove();
        CURRENT_SEAT_IDS.remove();
    }

    private Long requireUserId() {
        Long uid = CURRENT_USER_ID.get();
        if (uid == null) {
            throw new IllegalStateException("用户上下文未初始化");
        }
        return uid;
    }

    // ========== 业务工具 ==========

    @Tool("根据影片名称或类型查询影片列表。当用户表达模糊意图（如'想看个喜剧'）或指定片名时调用。返回影片卡片数据。")
    public CardPayload searchMovies(
            @P("影片名称关键词，如'流浪地球3'；用户未指定片名时传空字符串") String keyword,
            @P("影片类型标签，如'喜剧'、'科幻'；无类型约束时传空字符串") String type
    ) {
        log.info("[Tool:searchMovies] keyword={}, type={}", keyword, type);
        Result<Object> result = ticketClient.searchMovies(keyword, type);
        if (result.getCode() != 0) {
            log.warn("[Tool:searchMovies] 查询失败: {}", result.getMessage());
            return CardPayload.builder()
                    .cardType("movie_list")
                    .cardData(Map.of("movies", List.of(), "error", result.getMessage()))
                    .build();
        }
        List<MovieRow> movies = extractRows(result.getData(), "movies", MovieRow.class);
        List<CardPayload.MovieCard> cards = movies.stream()
                .map(m -> CardPayload.MovieCard.builder()
                        .id(m.getId())
                        .name(m.getName())
                        .posterUrl(m.getPosterUrl())
                        .rating(m.getRating())
                        .types(m.getTypes())
                        .duration(m.getDuration())
                        .build())
                .collect(Collectors.toList());
        return CardPayload.movieList(cards);
    }

    @Tool("根据名称或设施查询影院列表。用户选定影片后或主动询问影院时调用。返回影院卡片数据。")
    public CardPayload searchCinemas(
            @P("影院名称关键词，如'万达影城'；无约束时传空字符串") String keyword,
            @P("设施要求，如'IMAX'；无要求时传空字符串") String facilities
    ) {
        log.info("[Tool:searchCinemas] keyword={}, facilities={}", keyword, facilities);
        Result<Object> result = ticketClient.searchCinemas(keyword, facilities);
        if (result.getCode() != 0) {
            log.warn("[Tool:searchCinemas] 查询失败: {}", result.getMessage());
            return CardPayload.builder()
                    .cardType("cinema_list")
                    .cardData(Map.of("cinemas", List.of(), "error", result.getMessage()))
                    .build();
        }
        List<CinemaRow> cinemas = extractRows(result.getData(), "cinemas", CinemaRow.class);
        List<CardPayload.CinemaCard> cards = cinemas.stream()
                .map(c -> CardPayload.CinemaCard.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .address(c.getAddress())
                        .distance(c.getDistance())
                        .facilities(c.getFacilities())
                        .rating(c.getRating())
                        .build())
                .collect(Collectors.toList());
        return CardPayload.cinemaList(cards);
    }

    @Tool("查询场次列表。用户选定影片和影院后调用，根据 movieId+cinemaId+date 获取可售场次。返回场次卡片数据。")
    public CardPayload querySessions(
            @P("影片 ID（由 searchMovies 返回）") Long movieId,
            @P("影院 ID（由 searchCinemas 返回）") Long cinemaId,
            @P("放映日期，支持'今天'、'明天'、'后天'或具体日期；用户未指定时传空字符串") String date
    ) {
        log.info("[Tool:querySessions] movieId={}, cinemaId={}, date={}", movieId, cinemaId, date);
        Result<Object> result = ticketClient.searchSessions(movieId, cinemaId, date);
        if (result.getCode() != 0) {
            log.warn("[Tool:querySessions] 查询失败: {}", result.getMessage());
            return CardPayload.builder()
                    .cardType("session_list")
                    .cardData(Map.of("sessions", List.of(), "error", result.getMessage()))
                    .build();
        }
        List<SessionRow> sessions = extractRows(result.getData(), "sessions", SessionRow.class);
        List<CardPayload.SessionCard> cards = sessions.stream()
                .map(s -> CardPayload.SessionCard.builder()
                        .id(s.getId())
                        .showDate(s.getShowDate())
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .hallName(s.getHallName())
                        .languageVersion(s.getLanguageVersion())
                        .price(s.getPrice())
                        .availableSeats(s.getAvailableSeats())
                        .build())
                .collect(Collectors.toList());
        return CardPayload.sessionList(cards);
    }

    @Tool("获取座位图。用户选定场次后调用，返回全部座位状态（available/locked/sold）。")
    public CardPayload getSeatMap(
            @P("场次 ID（由 querySessions 返回）") Long scheduleId
    ) {
        log.info("[Tool:getSeatMap] scheduleId={}", scheduleId);
        Result<Object> result = ticketClient.getSeatMap(scheduleId);
        if (result.getCode() != 0) {
            log.warn("[Tool:getSeatMap] 查询失败: {}", result.getMessage());
            return CardPayload.builder()
                    .cardType("seat_map")
                    .cardData(Map.of("error", result.getMessage()))
                    .build();
        }
        return CardPayload.builder()
                .cardType("seat_map")
                .cardData(result.getData())
                .build();
    }

    @Tool("查询当前用户的订单列表。用户表达查询/修改/退票意图时调用。")
    public CardPayload queryOrders(
            @P("订单状态过滤，如'pending'（待支付）、'paid'（已支付）、'refunded'（已退票）；查全部传空字符串") String status
    ) {
        Long userId = requireUserId();
        log.info("[Tool:queryOrders] userId={}, status={}", userId, status);
        Result<Object> result = ticketClient.queryUserOrders(userId);
        if (result.getCode() != 0) {
            log.warn("[Tool:queryOrders] 查询失败: {}", result.getMessage());
            return CardPayload.builder()
                    .cardType("pending_order")
                    .cardData(Map.of("orders", List.of(), "error", result.getMessage()))
                    .build();
        }
        return CardPayload.builder()
                .cardType("pending_order")
                .cardData(result.getData())
                .build();
    }

    @Tool("锁座并创建订单。前端选座后由 Agent 调用，传入 userId+scheduleId+seatIds+ticketCount+requestId。返回订单确认卡片。")
    public CardPayload lockAndCreateOrder(
            @P("场次 ID（前端选场次后直接提供）") Long scheduleId,
            @P("座位 ID 列表（前端选座后直接提供，无需 LLM 提取）") List<Long> seatIds,
            @P("购票数量（=座位数）") Integer ticketCount,
            @P("幂等请求ID，UUID 格式，前端生成") String requestId
    ) {
        Long userId = requireUserId();
        log.info("[Tool:lockAndCreateOrder] userId={}, scheduleId={}, seatIds={}, count={}, requestId={}",
                userId, scheduleId, seatIds, ticketCount, requestId);
        Result<Object> result = ticketClient.lockSeat(userId, scheduleId, seatIds, ticketCount, requestId);
        if (result.getCode() != 0) {
            log.warn("[Tool:lockAndCreateOrder] 锁座失败: {}", result.getMessage());
            return CardPayload.builder()
                    .cardType("order_confirm")
                    .cardData(Map.of("error", result.getMessage()))
                    .build();
        }
        Map<String, Object> data = toMap(result.getData());
        return CardPayload.builder()
                .cardType("order_confirm")
                .cardData(data)
                .build();
    }

    @Tool("查询订单详情。用户询问订单状态或发起退票前调用。")
    public CardPayload queryOrderDetail(
            @P("订单 ID（由 queryOrders 返回）") Long orderId
    ) {
        Long userId = requireUserId();
        log.info("[Tool:queryOrderDetail] orderId={}, userId={}", orderId, userId);
        Result<Object> result = ticketClient.queryOrderDetail(orderId, userId);
        if (result.getCode() != 0) {
            log.warn("[Tool:queryOrderDetail] 查询失败: {}", result.getMessage());
            return CardPayload.builder()
                    .cardType("order_success")
                    .cardData(Map.of("error", result.getMessage()))
                    .build();
        }
        return CardPayload.builder()
                .cardType("order_success")
                .cardData(result.getData())
                .build();
    }

    // ========== 内部工具方法 ==========

    @SuppressWarnings({"rawtypes", "unchecked"})
    private <T> List<T> extractRows(Object data, String key, Class<T> clazz) {
        if (data == null) {
            return List.of();
        }
        Object rows;
        if (data instanceof Map m) {
            rows = m.get(key);
        } else {
            rows = data;
        }
        if (rows == null) {
            return List.of();
        }
        if (rows instanceof List l) {
            return (List<T>) l.stream()
                    .map(item -> convert(item, clazz))
                    .filter(Objects::nonNull)
                    .toList();
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> toMap(Object obj) {
        if (obj == null) {
            return Map.of();
        }
        if (obj instanceof Map) {
            return (Map<String, Object>) obj;
        }
        // Bean → Map 简化处理，交给 Jackson ObjectMapper 在上层转换
        return Map.of("data", obj);
    }

    @SuppressWarnings("unchecked")
    private <T> T convert(Object item, Class<T> clazz) {
        if (item == null) {
            return null;
        }
        if (clazz.isInstance(item)) {
            return (T) item;
        }
        if (item instanceof Map map) {
            try {
                return new com.fasterxml.jackson.databind.ObjectMapper()
                        .convertValue(map, clazz);
            } catch (Exception ex) {
                log.warn("[convert] 转换失败: {}", ex.getMessage());
                return null;
            }
        }
        return null;
    }

    // ========== Row DTO（对应 ticket-service 返回字段） ==========

    @lombok.Data
    public static class MovieRow {
        private Long id;
        private String name;
        private String posterUrl;
        private java.math.BigDecimal rating;
        private String[] types;
        private Integer duration;
    }

    @lombok.Data
    public static class CinemaRow {
        private Long id;
        private String name;
        private String address;
        private String distance;
        private String[] facilities;
        private java.math.BigDecimal rating;
    }

    @lombok.Data
    public static class SessionRow {
        private Long id;
        private String showDate;
        private String startTime;
        private String endTime;
        private String hallName;
        private String languageVersion;
        private java.math.BigDecimal price;
        private Integer availableSeats;
    }
}
