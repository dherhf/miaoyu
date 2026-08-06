package org.dherhf.agent.tool;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.model.card.CardPayload;
import org.dherhf.agent.model.ticket.RequestContext;
import org.dherhf.agent.service.ContextService;
import org.dherhf.agent.service.IdempotentService;
import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.common.result.Result;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * LangChain4j 业务工具集，通过 @Tool 注解暴露给 LLM 进行 Function Calling。
 * <p>
 * 设计原则：Tool 只做透传——参数和返回值均为 String，不做格式化/转换。
 * 所有格式化逻辑（日期解析、类型映射、卡片构建等）交给 LLM 处理。
 * </p>
 * <p>
 * 每次请求由 DialogueService 创建新实例，通过 sessionId 从 Redis 查询请求上下文（userId / requestId 等）。
 * 工具方法返回后端原始 JSON，同时将卡片数据缓冲供 SSE 推送。
 * </p>
 */
@Slf4j
public class TicketTools {

    private final TicketServiceClient ticketClient;
    private final tools.jackson.databind.ObjectMapper objectMapper;
    private final ContextService contextService;
    private final IdempotentService idempotentService;
    private final String sessionId;

    private final List<CardPayload> cardBuffer = new ArrayList<>();

    public TicketTools(TicketServiceClient ticketClient,
                       tools.jackson.databind.ObjectMapper objectMapper,
                       ContextService contextService,
                       IdempotentService idempotentService,
                       String sessionId) {
        this.ticketClient = ticketClient;
        this.objectMapper = objectMapper;
        this.contextService = contextService;
        this.idempotentService = idempotentService;
        this.sessionId = sessionId;
    }

    /**
     * 取出并清空卡片缓冲区（由 DialogueService 在 LLM 回复后调用）。
     */
    public List<CardPayload> drainCards() {
        List<CardPayload> snapshot = new ArrayList<>(cardBuffer);
        cardBuffer.clear();
        return snapshot;
    }

    /**
     * 将后端返回的原始数据加入卡片缓冲区，供 SSE 推送。
     */
    private void emitCard(String cardType, Object cardData) {
        cardBuffer.add(CardPayload.builder()
                .cardType(cardType)
                .cardData(cardData)
                .build());
    }

    private Long requireUserId() {
        RequestContext ctx = contextService.getRequestContext(sessionId);
        if (ctx == null || ctx.getUserId() == null) {
            throw new IllegalStateException("请求上下文未初始化: sessionId=" + sessionId);
        }
        return ctx.getUserId();
    }

    private String getRequestId() {
        RequestContext ctx = contextService.getRequestContext(sessionId);
        String rid = ctx != null ? ctx.getRequestId() : null;
        return rid != null && !rid.isBlank() ? rid : UUID.randomUUID().toString();
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("[toJson] 序列化失败: {}", e.getMessage());
            return "{\"code\":" + ErrorCodeEnum.TOOL_ERROR.getCode()
                    + ",\"message\":\"工具返回值序列化失败\"}";
        }
    }

    private static Long parseLong(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Long.parseLong(s.trim()); } catch (NumberFormatException e) { return null; }
    }

    private static Integer parseInt(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Integer.parseInt(s.trim()); } catch (NumberFormatException e) { return null; }
    }

    private static List<Long> parseLongList(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split(","))
                .map(String::trim)
                .filter(str -> !str.isEmpty())
                .map(str -> {
                    try { return Long.parseLong(str); } catch (NumberFormatException e) { return null; }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    // ========== 业务工具 ==========

    @Tool("根据影片名称或类型查询影片列表。当用户表达模糊意图（如'想看个喜剧'）或指定片名时调用。也可按影院查影片（如'长沙学院有什么电影'）。返回后端原始 JSON 数据。")
    public String searchMovies(
            @P("影片名称关键词，如'流浪地球3'；用户未指定片名时传空字符串") String keyword,
            @P("影片类型标签，中文枚举值：科幻/动作/喜剧/爱情/悬疑/动画/纪录片/其他；无类型约束时传空字符串") String type,
            @P("影院 ID，当用户想查某影院有哪些电影时传入（由 searchCinemas 返回）；无影院约束时传空字符串") String cinemaId
    ) {
        Long cinemaIdLong = parseLong(cinemaId);
        log.info("[Tool:searchMovies] keyword={}, type={}, cinemaId={}", keyword, type, cinemaIdLong);
        Result<Object> result = ticketClient.searchMovies(keyword, type, cinemaIdLong);
        if (result.getCode() == 0) {
            emitCard("movie_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("根据影片id,名称或设施查询影院列表。用户选定影片或主动询问影院时调用。返回后端原始 JSON 数据。")
    public String searchCinemas(
            @P("影片 ID（由 searchMovies 返回）；无影片约束时传空字符串") String movieId,
            @P("影院名称关键词，如'万达影城'；无约束时传空字符串") String keyword,
            @P("设施要求，如'IMAX'；无要求时传空字符串") String facilities
    ) {
        Long movieIdLong = parseLong(movieId);
        log.info("[Tool:searchCinemas] movieId={}, keyword={}, facilities={}", movieIdLong, keyword, facilities);
        Result<Object> result = ticketClient.searchCinemas(movieIdLong, keyword, facilities);
        if (result.getCode() == 0) {
            emitCard("cinema_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("查询场次列表。用户选定影片和影院后调用，根据 movieId+cinemaId+date 获取可售场次。返回后端原始 JSON 数据。")
    public String querySessions(
            @P("影片 ID（由 searchMovies 返回）") String movieId,
            @P("影院 ID（由 searchCinemas 返回）") String cinemaId,
            @P("放映日期，须为 yyyy-MM-dd 格式（你需要将'今天'、'明天'、'周X'、'M月D日'等相对日期转换为具体日期）；用户未指定时传空字符串") String date
    ) {
        Long movieIdLong = parseLong(movieId);
        Long cinemaIdLong = parseLong(cinemaId);
        log.info("[Tool:querySessions] movieId={}, cinemaId={}, date={}", movieIdLong, cinemaIdLong, date);
        Result<Object> result = ticketClient.searchSessions(movieIdLong, cinemaIdLong, date);
        if (result.getCode() == 0) {
            emitCard("session_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("获取座位图。用户选定场次后调用，返回全部座位状态（available/locked/sold）。返回后端原始 JSON 数据。")
    public String getSeatMap(
            @P("场次 ID（由 querySessions 返回）") String scheduleId
    ) {
        Long scheduleIdLong = parseLong(scheduleId);
        log.info("[Tool:getSeatMap] scheduleId={}", scheduleIdLong);
        Result<Object> result = ticketClient.getSeatMap(scheduleIdLong);
        if (result.getCode() == 0) {
            emitCard("seat_map", result.getData());
        }
        return toJson(result);
    }

    @Tool("查询当前用户的订单列表。用户表达查询/修改/退票意图时调用。返回后端原始 JSON 数据。")
    public String queryOrders(
            @P("订单状态过滤，如'pending'（待支付）、'paid'（已支付）、'refunded'（已退票）；查全部传空字符串") String status
    ) {
        Long userId = requireUserId();
        log.info("[Tool:queryOrders] userId={}, status={}", userId, status);
        Result<Object> result = ticketClient.queryUserOrders(userId, status);
        if (result.getCode() == 0) {
            emitCard("order_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("锁座并创建订单。前端选座后由 Agent 调用，传入 scheduleId+seatIds+ticketCount。返回后端原始 JSON 数据。")
    public String lockAndCreateOrder(
            @P("场次 ID（前端选场次后直接提供）") String scheduleId,
            @P("座位 ID 列表，逗号分隔（前端选座后直接提供，无需 LLM 提取）") String seatIds,
            @P("购票数量（=座位数）") String ticketCount
    ) {
        Long userId = requireUserId();
        Long scheduleIdLong = parseLong(scheduleId);
        List<Long> seatIdList = parseLongList(seatIds);
        Integer count = parseInt(ticketCount);
        if (count == null) {
            RequestContext ctx = contextService.getRequestContext(sessionId);
            count = ctx != null ? ctx.getTicketCount() : null;
        }
        String requestId = getRequestId();
        log.info("[Tool:lockAndCreateOrder] userId={}, scheduleId={}, seatIds={}, count={}, requestId={}",
                userId, scheduleIdLong, seatIdList, count, requestId);

        String cached = idempotentService.getIfPresent(requestId, String.class);
        if (cached != null) {
            log.info("[Tool:lockAndCreateOrder] 幂等命中缓存: requestId={}", requestId);
            return cached;
        }

        Result<Object> result = ticketClient.lockSeat(userId, scheduleIdLong, seatIdList, count, requestId);
        String json = toJson(result);
        if (result.getCode() == 0) {
            idempotentService.put(requestId, json);
            emitCard("order_confirm", result.getData());
        }
        return json;
    }

    @Tool("查询订单详情。用户询问订单状态或发起退票前调用。返回后端原始 JSON 数据。")
    public String queryOrderDetail(
            @P("订单 ID（由 queryOrders 返回）") String orderId
    ) {
        Long userId = requireUserId();
        Long orderIdLong = parseLong(orderId);
        log.info("[Tool:queryOrderDetail] orderId={}, userId={}", orderIdLong, userId);
        Result<Object> result = ticketClient.queryOrderDetail(orderIdLong, userId);
        if (result.getCode() == 0) {
            emitCard("order_success", result.getData());
        }
        return toJson(result);
    }

    @Tool("支付订单。用户确认支付待支付订单时调用。返回后端原始 JSON 数据（含取票码）。")
    public String payOrder(
            @P("订单 ID（由 queryOrders 或 lockAndCreateOrder 返回）") String orderId
    ) {
        Long userId = requireUserId();
        Long orderIdLong = parseLong(orderId);
        String requestId = getRequestId();
        log.info("[Tool:payOrder] userId={}, orderId={}, requestId={}", userId, orderIdLong, requestId);

        String cached = idempotentService.getIfPresent(requestId, String.class);
        if (cached != null) {
            log.info("[Tool:payOrder] 幂等命中缓存: requestId={}", requestId);
            return cached;
        }

        Result<Object> result = ticketClient.payOrder(userId, orderIdLong, requestId);
        String json = toJson(result);
        if (result.getCode() == 0) {
            idempotentService.put(requestId, json);
            emitCard("order_success", result.getData());
        }
        return json;
    }

    @Tool("取消待支付订单。用户要求取消未支付订单时调用，释放锁定座位。仅待支付订单可取消。返回后端原始 JSON 数据。")
    public String cancelOrder(
            @P("订单 ID（由 queryOrders 返回）") String orderId
    ) {
        Long userId = requireUserId();
        Long orderIdLong = parseLong(orderId);
        String requestId = getRequestId();
        log.info("[Tool:cancelOrder] userId={}, orderId={}, requestId={}", userId, orderIdLong, requestId);

        String cached = idempotentService.getIfPresent(requestId, String.class);
        if (cached != null) {
            log.info("[Tool:cancelOrder] 幂等命中缓存: requestId={}", requestId);
            return cached;
        }

        Result<Object> result = ticketClient.cancelOrder(userId, orderIdLong, requestId);
        String json = toJson(result);
        if (result.getCode() == 0) {
            idempotentService.put(requestId, json);
            emitCard("order_success", result.getData());
        }
        return json;
    }

    @Tool("退票。用户要求退已支付订单时调用，释放已售座位并退款。仅已出票且未放映的订单可退。返回后端原始 JSON 数据。")
    public String refundOrder(
            @P("订单 ID（由 queryOrders 返回）") String orderId
    ) {
        Long userId = requireUserId();
        Long orderIdLong = parseLong(orderId);
        String requestId = getRequestId();
        log.info("[Tool:refundOrder] userId={}, orderId={}, requestId={}", userId, orderIdLong, requestId);

        String cached = idempotentService.getIfPresent(requestId, String.class);
        if (cached != null) {
            log.info("[Tool:refundOrder] 幂等命中缓存: requestId={}", requestId);
            return cached;
        }

        Result<Object> result = ticketClient.refundOrder(userId, orderIdLong, requestId);
        String json = toJson(result);
        if (result.getCode() == 0) {
            idempotentService.put(requestId, json);
            emitCard("order_success", result.getData());
        }
        return json;
    }
}
