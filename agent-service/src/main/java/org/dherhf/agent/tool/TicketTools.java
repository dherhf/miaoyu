package org.dherhf.agent.tool;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.common.result.Result;
import org.dherhf.agent.model.card.CardPayload;
import org.dherhf.agent.service.IdempotentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
    private final tools.jackson.databind.ObjectMapper objectMapper;
    private final IdempotentService idempotentService;

    @Autowired
    public TicketTools(TicketServiceClient ticketClient,
                       tools.jackson.databind.ObjectMapper objectMapper,
                       IdempotentService idempotentService) {
        this.ticketClient = ticketClient;
        this.objectMapper = objectMapper;
        this.idempotentService = idempotentService;
    }

    // ========== ThreadLocal 上下文：当前会话的 userId / scheduleId / seatIds / ticketCount ==========

    private static final ThreadLocal<Long> CURRENT_USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<Long> CURRENT_SCHEDULE_ID = new ThreadLocal<>();
    private static final ThreadLocal<List<Long>> CURRENT_SEAT_IDS = new ThreadLocal<>();
    private static final ThreadLocal<Integer> CURRENT_TICKET_COUNT = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_REQUEST_ID = new ThreadLocal<>();

    // P1-c 修复：卡片缓冲区，工具方法返回的 CardPayload 自动入缓冲，
    // 由 DialogueService 在 chat() 结束后 drainCards() 取出推送 SSE card 事件
    private static final ThreadLocal<List<CardPayload>> CARD_BUFFER = new ThreadLocal<>();

    public static void setContext(Long userId, Long scheduleId, List<Long> seatIds, Integer ticketCount, String requestId) {
        CURRENT_USER_ID.set(userId);
        CURRENT_SCHEDULE_ID.set(scheduleId);
        CURRENT_SEAT_IDS.set(seatIds);
        CURRENT_TICKET_COUNT.set(ticketCount);
        CURRENT_REQUEST_ID.set(requestId);
        CARD_BUFFER.set(new ArrayList<>());
    }

    public static void clearContext() {
        CURRENT_USER_ID.remove();
        CURRENT_SCHEDULE_ID.remove();
        CURRENT_SEAT_IDS.remove();
        CURRENT_TICKET_COUNT.remove();
        CURRENT_REQUEST_ID.remove();
        CARD_BUFFER.remove();
    }

    /**
     * 取出并清空卡片缓冲区（由 DialogueService 在 LLM 回复后调用）。
     */
    public static List<CardPayload> drainCards() {
        List<CardPayload> buffer = CARD_BUFFER.get();
        if (buffer == null) {
            return List.of();
        }
        CARD_BUFFER.set(new ArrayList<>());
        return buffer;
    }

    /**
     * 将工具产生的卡片加入缓冲区，同时返回该卡片。
     */
    private CardPayload emitCard(CardPayload card) {
        List<CardPayload> buffer = CARD_BUFFER.get();
        if (buffer != null) {
            buffer.add(card);
        }
        return card;
    }

    private Long requireUserId() {
        Long uid = CURRENT_USER_ID.get();
        if (uid == null) {
            throw new IllegalStateException("用户上下文未初始化");
        }
        return uid;
    }

    private static Long parseLong(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Long.parseLong(s.trim()); } catch (NumberFormatException e) { return null; }
    }

    /**
     * 获取前端透传的幂等 requestId，缺失时兜底生成（不保证重试幂等）。
     */
    private String getRequestId() {
        String rid = CURRENT_REQUEST_ID.get();
        return rid != null && !rid.isBlank() ? rid : UUID.randomUUID().toString();
    }

    // ========== 业务工具 ==========

    @Tool("根据影片名称或类型查询影片列表。当用户表达模糊意图（如'想看个喜剧'）或指定片名时调用。也可按影院查影片（如'长沙学院有什么电影'）。返回影片卡片数据。")
    public CardPayload searchMovies(
            @P("影片名称关键词，如'流浪地球3'；用户未指定片名时传空字符串") String keyword,
            @P("影片类型标签，英文枚举值：scifi(科幻)/action(动作)/comedy(喜剧)/romance(爱情)/suspense(悬疑)/animation(动画)/documentary(纪录片)/other(其他)；无类型约束时传空字符串") String type,
            @P("影院 ID，当用户想查某影院有哪些电影时传入（由 searchCinemas 返回）；无影院约束时传空字符串") String cinemaId
    ) {
        Long cinemaIdLong = parseLong(cinemaId);
        log.info("[Tool:searchMovies] keyword={}, type={}, cinemaId={}", keyword, type, cinemaIdLong);
        Result<Object> result = ticketClient.searchMovies(keyword, type, cinemaIdLong);
        log.info("[Tool:searchMovies] result code={}, data={}", result.getCode(), result.getData());
        if (result.getCode() != 0) {
            log.warn("[Tool:searchMovies] 查询失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("movie_list")
                    .cardData(Map.of("movies", List.of(), "error", result.getMessage()))
                    .build());
        }
        List<MovieRow> movies = extractRows(result.getData(), "records", MovieRow.class);
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
        return emitCard(CardPayload.movieList(cards));
    }

    @Tool("根据名称或设施查询影院列表。用户选定影片后或主动询问影院时调用。返回影院卡片数据。")
    public CardPayload searchCinemas(
            @P("影院名称关键词，如'万达影城'；无约束时传空字符串") String keyword,
            @P("设施要求，如'IMAX'；无要求时传空字符串") String facilities
    ) {
        log.info("[Tool:searchCinemas] keyword={}, facilities={}", keyword, facilities);
        Result<Object> result = ticketClient.searchCinemas(keyword, facilities);
        log.info("[Tool:searchCinemas] result code={}, data={}", result.getCode(), result.getData());
        if (result.getCode() != 0) {
            log.warn("[Tool:searchCinemas] 查询失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("cinema_list")
                    .cardData(Map.of("cinemas", List.of(), "error", result.getMessage()))
                    .build());
        }
        List<CinemaRow> cinemas = extractRows(result.getData(), "records", CinemaRow.class);
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
        return emitCard(CardPayload.cinemaList(cards));
    }

    @Tool("查询场次列表。用户选定影片和影院后调用，根据 movieId+cinemaId+date 获取可售场次。返回场次卡片数据。")
    public CardPayload querySessions(
            @P("影片 ID（由 searchMovies 返回）") Long movieId,
            @P("影院 ID（由 searchCinemas 返回）") Long cinemaId,
            @P("放映日期，支持'今天'、'明天'、'后天'、'大后天'、'周X'、'M月D日'或具体日期；用户未指定时传空字符串") String date
    ) {
        String resolvedDate = resolveRelativeDate(date);
        log.info("[Tool:querySessions] movieId={}, cinemaId={}, date={} -> resolved={}", movieId, cinemaId, date, resolvedDate);
        Result<Object> result = ticketClient.searchSessions(movieId, cinemaId, resolvedDate);
        if (result.getCode() != 0) {
            log.warn("[Tool:querySessions] 查询失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("session_list")
                    .cardData(Map.of("sessions", List.of(), "error", result.getMessage()))
                    .build());
        }
        List<SessionRow> sessions = extractRows(result.getData(), "records", SessionRow.class);
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
        return emitCard(CardPayload.sessionList(cards));
    }

    @Tool("获取座位图。用户选定场次后调用，返回全部座位状态（available/locked/sold）。")
    public CardPayload getSeatMap(
            @P("场次 ID（由 querySessions 返回）") Long scheduleId
    ) {
        log.info("[Tool:getSeatMap] scheduleId={}", scheduleId);
        Result<Object> result = ticketClient.getSeatMap(scheduleId);
        if (result.getCode() != 0) {
            log.warn("[Tool:getSeatMap] 查询失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("seat_map")
                    .cardData(Map.of("error", result.getMessage()))
                    .build());
        }
        return emitCard(CardPayload.builder()
                .cardType("seat_map")
                .cardData(result.getData())
                .build());
    }

    @Tool("查询当前用户的订单列表。用户表达查询/修改/退票意图时调用。")
    public CardPayload queryOrders(
            @P("订单状态过滤，如'pending'（待支付）、'paid'（已支付）、'refunded'（已退票）；查全部传空字符串") String status
    ) {
        Long userId = requireUserId();
        log.info("[Tool:queryOrders] userId={}, status={}", userId, status);
        // P1-b 修复：将 status 传给 ticketClient
        Result<Object> result = ticketClient.queryUserOrders(userId, status);
        if (result.getCode() != 0) {
            log.warn("[Tool:queryOrders] 查询失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("pending_order")
                    .cardData(Map.of("orders", List.of(), "error", result.getMessage()))
                    .build());
        }
        return emitCard(CardPayload.builder()
                .cardType("pending_order")
                .cardData(result.getData())
                .build());
    }

    @Tool("锁座并创建订单。前端选座后由 Agent 调用，传入 scheduleId+seatIds+ticketCount。返回订单确认卡片。")
    public CardPayload lockAndCreateOrder(
            @P("场次 ID（前端选场次后直接提供）") Long scheduleId,
            @P("座位 ID 列表（前端选座后直接提供，无需 LLM 提取）") List<Long> seatIds,
            @P("购票数量（=座位数）") Integer ticketCount
    ) {
        Long userId = requireUserId();
        // P1-a 修复：优先使用前端传入的 ticketCount，LLM 未提供时回退到上下文中的值
        Integer effectiveTicketCount = ticketCount != null ? ticketCount : CURRENT_TICKET_COUNT.get();
        String requestId = getRequestId();
        log.info("[Tool:lockAndCreateOrder] userId={}, scheduleId={}, seatIds={}, count={}, requestId={}",
                userId, scheduleId, seatIds, effectiveTicketCount, requestId);

        // agent 层幂等校验
        CardPayload cached = idempotentService.getIfPresent(requestId, CardPayload.class);
        if (cached != null) {
            log.info("[Tool:lockAndCreateOrder] 幂等命中缓存: requestId={}", requestId);
            return emitCard(cached);
        }

        Result<Object> result = ticketClient.lockSeat(userId, scheduleId, seatIds, effectiveTicketCount, requestId);
        if (result.getCode() != 0) {
            log.warn("[Tool:lockAndCreateOrder] 锁座失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("order_confirm")
                    .cardData(Map.of("error", result.getMessage()))
                    .build());
        }
        Map<String, Object> data = toMap(result.getData());
        CardPayload card = CardPayload.builder()
                .cardType("order_confirm")
                .cardData(data)
                .build();
        idempotentService.put(requestId, card);
        return emitCard(card);
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
            return emitCard(CardPayload.builder()
                    .cardType("order_success")
                    .cardData(Map.of("error", result.getMessage()))
                    .build());
        }
        return emitCard(CardPayload.builder()
                .cardType("order_success")
                .cardData(result.getData())
                .build());
    }

    @Tool("支付订单。用户确认支付待支付订单时调用。返回支付结果（含取票码）。")
    public CardPayload payOrder(
            @P("订单 ID（由 queryOrders 或 lockAndCreateOrder 返回）") Long orderId
    ) {
        Long userId = requireUserId();
        String requestId = getRequestId();
        log.info("[Tool:payOrder] userId={}, orderId={}, requestId={}", userId, orderId, requestId);

        // agent 层幂等校验
        CardPayload cached = idempotentService.getIfPresent(requestId, CardPayload.class);
        if (cached != null) {
            log.info("[Tool:payOrder] 幂等命中缓存: requestId={}", requestId);
            return emitCard(cached);
        }

        Result<Object> result = ticketClient.payOrder(userId, orderId, requestId);
        if (result.getCode() != 0) {
            log.warn("[Tool:payOrder] 支付失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("order_success")
                    .cardData(Map.of("error", result.getMessage()))
                    .build());
        }
        CardPayload card = CardPayload.builder()
                .cardType("order_success")
                .cardData(result.getData())
                .build();
        idempotentService.put(requestId, card);
        return emitCard(card);
    }

    @Tool("取消待支付订单。用户要求取消未支付订单时调用，释放锁定座位。仅待支付订单可取消。")
    public CardPayload cancelOrder(
            @P("订单 ID（由 queryOrders 返回）") Long orderId
    ) {
        Long userId = requireUserId();
        String requestId = getRequestId();
        log.info("[Tool:cancelOrder] userId={}, orderId={}, requestId={}", userId, orderId, requestId);

        // agent 层幂等校验
        CardPayload cached = idempotentService.getIfPresent(requestId, CardPayload.class);
        if (cached != null) {
            log.info("[Tool:cancelOrder] 幂等命中缓存: requestId={}", requestId);
            return emitCard(cached);
        }

        Result<Object> result = ticketClient.cancelOrder(userId, orderId, requestId);
        if (result.getCode() != 0) {
            log.warn("[Tool:cancelOrder] 取消失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("order_success")
                    .cardData(Map.of("error", result.getMessage()))
                    .build());
        }
        CardPayload card = CardPayload.builder()
                .cardType("order_success")
                .cardData(Map.of("orderId", orderId, "status", "cancelled"))
                .build();
        idempotentService.put(requestId, card);
        return emitCard(card);
    }

    @Tool("退票。用户要求退已支付订单时调用，释放已售座位并退款。仅已出票且未放映的订单可退。")
    public CardPayload refundOrder(
            @P("订单 ID（由 queryOrders 返回）") Long orderId
    ) {
        Long userId = requireUserId();
        String requestId = getRequestId();
        log.info("[Tool:refundOrder] userId={}, orderId={}, requestId={}", userId, orderId, requestId);

        // agent 层幂等校验
        CardPayload cached = idempotentService.getIfPresent(requestId, CardPayload.class);
        if (cached != null) {
            log.info("[Tool:refundOrder] 幂等命中缓存: requestId={}", requestId);
            return emitCard(cached);
        }

        Result<Object> result = ticketClient.refundOrder(userId, orderId, requestId);
        if (result.getCode() != 0) {
            log.warn("[Tool:refundOrder] 退票失败: {}", result.getMessage());
            return emitCard(CardPayload.builder()
                    .cardType("order_success")
                    .cardData(Map.of("error", result.getMessage()))
                    .build());
        }
        CardPayload card = CardPayload.builder()
                .cardType("order_success")
                .cardData(Map.of("orderId", orderId, "status", "refunded"))
                .build();
        idempotentService.put(requestId, card);
        return emitCard(card);
    }

    // ========== 内部工具方法 ==========

    private static final Pattern WEEKDAY_PATTERN = Pattern.compile("周([一二三四五六日天])");
    private static final Pattern MONTH_DAY_PATTERN = Pattern.compile("(\\d{1,2})月(\\d{1,2})日");
    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})");
    private static final Map<String, DayOfWeek> WEEKDAY_MAP = Map.of(
            "一", DayOfWeek.MONDAY, "二", DayOfWeek.TUESDAY, "三", DayOfWeek.WEDNESDAY,
            "四", DayOfWeek.THURSDAY, "五", DayOfWeek.FRIDAY, "六", DayOfWeek.SATURDAY,
            "日", DayOfWeek.SUNDAY, "天", DayOfWeek.SUNDAY);

    /**
     * 将中文相对日期解析为 YYYY-MM-DD 格式。
     * 支持：今天/明天/后天/大后天/周X/M月D日/YYYY-M-D/YYYY-MM-DD
     * 支持去掉时段后缀（明天下午→明天）。
     */
    private static String resolveRelativeDate(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String text = input.trim();
        LocalDate today = LocalDate.now();

        // 去掉时段后缀：上午/下午/晚上/早上/中午/傍晚/夜里
        text = text.replaceAll("(上午|下午|晚上|早上|中午|傍晚|夜里|晚)$", "").trim();

        switch (text) {
            case "今天", "今日" -> { return today.toString(); }
            case "明天", "明日" -> { return today.plusDays(1).toString(); }
            case "后天" -> { return today.plusDays(2).toString(); }
            case "大后天" -> { return today.plusDays(3).toString(); }
            default -> {}
        }

        // 周X
        Matcher weekMatcher = WEEKDAY_PATTERN.matcher(text);
        if (weekMatcher.matches()) {
            DayOfWeek target = WEEKDAY_MAP.get(weekMatcher.group(1));
            if (target != null) {
                int diff = target.getValue() - today.getDayOfWeek().getValue();
                if (diff <= 0) diff += 7;
                return today.plusDays(diff).toString();
            }
        }

        // M月D日
        Matcher mdMatcher = MONTH_DAY_PATTERN.matcher(text);
        if (mdMatcher.matches()) {
            int month = Integer.parseInt(mdMatcher.group(1));
            int day = Integer.parseInt(mdMatcher.group(2));
            int year = today.getYear();
            LocalDate candidate = LocalDate.of(year, month, day);
            if (candidate.isBefore(today)) {
                candidate = candidate.plusYears(1);
            }
            return candidate.toString();
        }

        // YYYY-M-D 或 YYYY-MM-DD
        Matcher dateMatcher = DATE_PATTERN.matcher(text);
        if (dateMatcher.matches()) {
            try {
                return LocalDate.of(
                        Integer.parseInt(dateMatcher.group(1)),
                        Integer.parseInt(dateMatcher.group(2)),
                        Integer.parseInt(dateMatcher.group(3))).toString();
            } catch (DateTimeParseException e) {
                return null;
            }
        }

        // 已经是 YYYY-MM-DD 格式
        try {
            return LocalDate.parse(text).toString();
        } catch (DateTimeParseException e) {
            return null;
        }
    }

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
                return objectMapper.convertValue(map, clazz);
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
        private String releaseDate;
    }

    @lombok.Data
    public static class CinemaRow {
        private Long id;
        private String name;
        private String address;
        private Long distance;
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
