package org.dherhf.agent.tool;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.ToolMemoryId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.model.card.CardPayload;
import org.dherhf.agent.model.dto.PreferenceUpdateDTO;
import org.dherhf.agent.model.ticket.RequestContext;
import org.dherhf.agent.service.ContextService;
import org.dherhf.agent.service.IdempotentService;
import org.dherhf.agent.service.UserPreferenceService;
import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.common.result.Result;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * LangChain4j 业务工具集，通过 {@code @Tool} 注解暴露给 LLM 进行 Function Calling。
 * <p>
 * 设计原则：Tool 只做透传——参数和返回值均为 String，不做格式化/转换。
 * 所有格式化逻辑（日期解析、类型映射、卡片构建等）交给 LLM 处理。
 * </p>
 * <p>
 * <b>重构要点：从「每请求 new 实例」改为 Spring 单例 Bean。</b>
 * Starter 在 AUTOMATIC 模式下自动扫描所有含 {@code @Tool} 方法的 Bean 并注入到 {@code @AiService}。
 * 原 per-session 状态（{@code sessionId} / {@code cardBuffer} / {@code cardSuppressed}）
 * 改用 {@code @ToolMemoryId} + {@link ConcurrentHashMap} 实现会话级隔离：
 * {@code @ToolMemoryId} 从 {@code @AiService} 的 {@code @MemoryId} 自动获取 sessionId，
 * 对 LLM 不可见，不影响函数 schema。
 * </p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TicketTools {

    private final TicketServiceClient ticketClient;
    private final AmapClient amapClient;
    private final ObjectMapper objectMapper;
    private final ContextService contextService;
    private final IdempotentService idempotentService;
    private final UserPreferenceService userPreferenceService;

    /** 会话级卡片缓冲：sessionId → 待推送卡片列表（每个会话独立，线程安全） */
    private final ConcurrentHashMap<String, List<CardPayload>> cardBuffers = new ConcurrentHashMap<>();

    /** 会话级卡片抑制标记：sessionId → 是否抑制（取消/退票后置 true，本轮不再推送卡片） */
    private final ConcurrentHashMap<String, Boolean> cardSuppressedFlags = new ConcurrentHashMap<>();

    /** 订单支付超时秒数，与 ticket-service OrderServiceImpl.ORDER_TIMEOUT_SECONDS 保持一致 */
    private static final int ORDER_TIMEOUT_SECONDS = 15 * 60;

    // ========== 会话级状态管理（由 ChatService 调用） ==========

    /**
     * 重置指定会话的工具状态（每轮对话开始前调用）。
     * 清除上一轮残留的卡片缓冲和抑制标记，确保每轮独立。
     */
    public void resetSessionState(String sessionId) {
        cardBuffers.remove(sessionId);
        cardSuppressedFlags.remove(sessionId);
    }

    /**
     * 取出并清空指定会话的卡片缓冲（LLM 回复后由 ChatService 调用）。
     */
    public List<CardPayload> drainCards(String sessionId) {
        List<CardPayload> buffer = cardBuffers.remove(sessionId);
        return buffer != null ? new ArrayList<>(buffer) : List.of();
    }

    /**
     * 清理会话级状态（会话结束/过期时调用，防止内存泄漏）。
     */
    public void clearSessionState(String sessionId) {
        cardBuffers.remove(sessionId);
        cardSuppressedFlags.remove(sessionId);
    }

    // ========== 会话级内部工具方法 ==========

    /** 获取（或初始化）当前会话的卡片缓冲列表 */
    private List<CardPayload> cardBufferOf(String sessionId) {
        return cardBuffers.computeIfAbsent(sessionId, k -> Collections.synchronizedList(new ArrayList<>()));
    }

    private void emitCard(String sessionId, String cardType, Object cardData) {
        if (Boolean.TRUE.equals(cardSuppressedFlags.get(sessionId))) return;
        cardBufferOf(sessionId).add(CardPayload.builder()
                .cardType(cardType)
                .cardData(cardData)
                .build());
    }

    private Long requireUserId(String sessionId) {
        RequestContext ctx = contextService.getRequestContext(sessionId);
        if (ctx == null || ctx.getUserId() == null) {
            throw new IllegalStateException("请求上下文未初始化: sessionId=" + sessionId);
        }
        return ctx.getUserId();
    }

    private String getRequestId(String sessionId) {
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

    /**
     * 将 JSON 字符串解析为对象后推入卡片缓冲区。
     * 避免 emitCard 传入 String 导致前端收到转义字符串而非 JSON 对象。
     */
    private void emitParsedCard(String sessionId, String cardType, String json) {
        try {
            Object parsed = objectMapper.readValue(json, Object.class);
            emitCard(sessionId, cardType, parsed);
        } catch (Exception e) {
            log.warn("[emitParsedCard] 解析失败，回退原始字符串: cardType={}", cardType);
            emitCard(sessionId, cardType, json);
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
                .filter(Objects::nonNull)
                .toList();
    }

    // ========== 业务工具（@ToolMemoryId sessionId 对 LLM 不可见） ==========

    @Tool("根据影片名称或类型查询影片列表。当用户表达模糊意图（如'想看个喜剧'）或指定片名时调用。也可按影院查影片（如'长沙学院有什么电影'）。返回后端原始 JSON 数据。")
    public String searchMovies(
            @ToolMemoryId String sessionId,
            @P("影片名称关键词，如'流浪地球3'；用户未指定片名时传空字符串") String keyword,
            @P("影片类型标签，中文枚举值：科幻/动作/喜剧/爱情/悬疑/动画/纪录片/其他；无类型约束时传空字符串") String type,
            @P("影院 ID，当用户想查某影院有哪些电影时传入（由 searchCinemas 返回）；无影院约束时传空字符串") String cinemaId
    ) {
        Long cinemaIdLong = parseLong(cinemaId);
        log.info("[Tool:searchMovies] sessionId={}, keyword={}, type={}, cinemaId={}", sessionId, keyword, type, cinemaIdLong);
        Result<Object> result = ticketClient.searchMovies(keyword, type, cinemaIdLong);
        if (result.getCode() == 0) {
            emitCard(sessionId, "movie_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("根据影片id,名称或设施查询影院列表。用户选定影片或主动询问影院时调用。返回后端原始 JSON 数据。")
    public String searchCinemas(
            @ToolMemoryId String sessionId,
            @P("影片 ID（由 searchMovies 返回）；无影片约束时传空字符串") String movieId,
            @P("影院名称关键词，如'万达影城'；无约束时传空字符串") String keyword,
            @P("设施要求，如'IMAX'；无要求时传空字符串") String facilities
    ) {
        Long movieIdLong = parseLong(movieId);
        log.info("[Tool:searchCinemas] sessionId={}, movieId={}, keyword={}, facilities={}", sessionId, movieIdLong, keyword, facilities);
        Result<Object> result = ticketClient.searchCinemas(movieIdLong, keyword, facilities);
        if (result.getCode() == 0) {
            emitCard(sessionId, "cinema_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("查询场次列表。用户选定影片和影院后调用，根据 movieId+cinemaId 获取可售场次。movieId 和 cinemaId 均为必填，缺失时须先调用 searchMovies/searchCinemas 获取。date 为可选参数，用户未指定日期时不要追问，直接传空字符串查询全部场次。返回后端原始 JSON 数据。")
    public String querySessions(
            @ToolMemoryId String sessionId,
            @P("影片 ID，必填（由 searchMovies 返回）") String movieId,
            @P("影院 ID，必填（由 searchCinemas 返回）") String cinemaId,
            @P("放映日期，可选。用户指定时须为 yyyy-MM-dd 格式（将'今天'、'明天'、'周X'、'M月D日'转换为具体日期）；用户未指定日期时传空字符串查询全部场次，不要追问") String date
    ) {
        Long movieIdLong = parseLong(movieId);
        Long cinemaIdLong = parseLong(cinemaId);
        if (movieIdLong == null) {
            return "{\"code\":400,\"message\":\"影片ID缺失——请先调用 searchMovies 查询影片获取 movieId，再调用本工具。\"}";
        }
        if (cinemaIdLong == null) {
            return "{\"code\":400,\"message\":\"影院ID缺失——请先调用 searchCinemas 查询影院获取 cinemaId，再调用本工具。\"}";
        }
        log.info("[Tool:querySessions] sessionId={}, movieId={}, cinemaId={}, date={}", sessionId, movieIdLong, cinemaIdLong, date);
        Result<Object> result = ticketClient.searchSessions(movieIdLong, cinemaIdLong, date);
        if (result.getCode() == 0) {
            emitCard(sessionId, "session_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("获取座位图。用户选定场次后调用，返回全部座位状态（available/locked/sold）。返回后端原始 JSON 数据。")
    public String getSeatMap(
            @ToolMemoryId String sessionId,
            @P("场次 ID（由 querySessions 返回）") String scheduleId
    ) {
        Long scheduleIdLong = parseLong(scheduleId);
        log.info("[Tool:getSeatMap] sessionId={}, scheduleId={}", sessionId, scheduleIdLong);
        Result<Object> result = ticketClient.getSeatMap(scheduleIdLong);
        if (result.getCode() == 0) {
            emitCard(sessionId, "seat_map", result.getData());
        }
        return toJson(result);
    }

    @Tool("查询当前用户的订单列表，支持分页。用户表达'查订单''我的订单'等查看全部订单意图时调用。已知订单ID查询单个订单请用 queryOrderDetail。返回后端原始 JSON 数据。")
    public String queryOrders(
            @ToolMemoryId String sessionId,
            @P("订单状态过滤，如'pending'（待支付）、'paid'（已支付）、'refunded'（已退票）；查全部传空字符串") String status,
            @P("页码，从1开始；用户未指定时传空字符串默认第1页，每页固定5条") String page
    ) {
        Long userId = requireUserId(sessionId);
        Integer pageNum = parseInt(page);
        if (pageNum == null || pageNum < 1) pageNum = 1;
        log.info("[Tool:queryOrders] sessionId={}, userId={}, status={}, page={}", sessionId, userId, status, pageNum);
        Result<Object> result = ticketClient.queryUserOrders(userId, status, pageNum, 5);
        if (result.getCode() == 0) {
            emitCard(sessionId, "order_list", result.getData());
        }
        return toJson(result);
    }

    @Tool("锁座并创建订单。前端选座后由 Agent 调用，传入 scheduleId+seatIds+ticketCount。返回后端原始 JSON 数据。")
    public String lockAndCreateOrder(
            @ToolMemoryId String sessionId,
            @P("场次 ID（前端选场次后直接提供）") String scheduleId,
            @P("座位 ID 列表，逗号分隔（前端选座后直接提供，无需 LLM 提取）") String seatIds,
            @P("购票数量（=座位数）") String ticketCount
    ) {
        Long userId = requireUserId(sessionId);
        Long scheduleIdLong = parseLong(scheduleId);
        List<Long> seatIdList = parseLongList(seatIds);
        Integer count = parseInt(ticketCount);
        if (count == null) {
            RequestContext ctx = contextService.getRequestContext(sessionId);
            count = ctx != null ? ctx.getTicketCount() : null;
        }

        // 前置校验：在调用远端 API 前给出明确指引，帮助 LLM 自我纠错
        if (scheduleIdLong == null) {
            return "{\"code\":400,\"message\":\"场次ID无效，请确认已从前端或 querySessions 返回结果中获取有效的数字格式 scheduleId。\"}";
        }
        if (seatIdList.isEmpty()) {
            return "{\"code\":400,\"message\":\"座位ID无效——请先调用 getSeatMap 获取该场次的座位图，从返回的 seats 数组中找到目标座位（根据 seatLabel 如 F9、F10 匹配），再使用其 hallCellId（数字格式）调用本工具。\"}";
        }
        if (count == null) {
            return "{\"code\":400,\"message\":\"购票数量缺失，请确认后重试。\"}";
        }
        if (seatIdList.size() != count) {
            return "{\"code\":400,\"message\":\"购票数量(" + count + ")与座位数(" + seatIdList.size() + ")不一致，请检查 seatIds 和 ticketCount 是否对应。\"}";
        }
        if (count > 6) {
            return "{\"code\":400,\"message\":\"单次最多购买6张票，当前选择了" + count + "张。请减少座位数量。\"}";
        }
        String requestId = getRequestId(sessionId);
        log.info("[Tool:lockAndCreateOrder] sessionId={}, userId={}, scheduleId={}, seatIds={}, count={}, requestId={}",
                sessionId, userId, scheduleIdLong, seatIdList, count, requestId);

        String cached = idempotentService.getIfPresent(userId, requestId, String.class);
        if (cached != null) {
            log.info("[Tool:lockAndCreateOrder] 幂等命中缓存: requestId={}", requestId);
            return cached;
        }

        Result<Object> result = ticketClient.lockSeat(userId, scheduleIdLong, seatIdList, count, requestId);
        String json = toJson(result);
        if (result.getCode() == 0) {
            idempotentService.put(userId, requestId, json);
            emitCard(sessionId, "order_confirm", result.getData());
        }
        return json;
    }

    @Tool("查询单个订单详情。用户询问特定订单（已知订单ID）的状态、取票码等信息时调用。返回后端原始 JSON 数据。")
    public String queryOrderDetail(
            @ToolMemoryId String sessionId,
            @P("订单 ID（由 queryOrders 返回或用户直接提供）") String orderId
    ) {
        Long userId = requireUserId(sessionId);
        Long orderIdLong = parseLong(orderId);
        if (orderIdLong == null) {
            return toJson(Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "订单ID无效，请从 queryOrders 返回结果中获取有效订单ID"));
        }
        log.info("[Tool:queryOrderDetail] sessionId={}, orderId={}, userId={}", sessionId, orderIdLong, userId);
        Result<Object> result = ticketClient.queryOrderDetail(orderIdLong, userId);
        String json = toJson(result);
        if (result.getCode() == 0 && result.getData() != null) {
            try {
                // 查询单个订单时推送 order_confirm 卡片（而非 order_list），
                // 确保对话服务推送的最后一张卡片是单个订单详情
                Map<String, Object> cardData = objectMapper.convertValue(
                        result.getData(), new TypeReference<>() {
                        });
                String status = (String) cardData.get("status");
                if ("pending".equals(status)) {
                    String createdAtStr = (String) cardData.get("createdAt");
                    if (createdAtStr != null) {
                        LocalDateTime createdAt = LocalDateTime.parse(createdAtStr,
                                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                        int remaining = ORDER_TIMEOUT_SECONDS
                                - (int) Duration.between(createdAt, LocalDateTime.now()).getSeconds();
                        if (remaining < 0) remaining = 0;
                        LocalDateTime expireAt = createdAt.plusSeconds(ORDER_TIMEOUT_SECONDS);
                        cardData.put("remainingTime", remaining);
                        cardData.put("expireAt", expireAt.format(
                                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                    }
                }
                emitCard(sessionId, "order_confirm", cardData);
            } catch (Exception e) {
                log.warn("[queryOrderDetail] 卡片构建失败，回退原始数据: {}", e.getMessage());
                emitCard(sessionId, "order_confirm", result.getData());
            }
        }
        return json;
    }


    @Tool("退票。用户要求退已支付订单时调用，释放已售座位并退款。仅已出票且未放映的订单可退。返回后端原始 JSON 数据。")
    public String refundOrder(
            @ToolMemoryId String sessionId,
            @P("订单 ID（由 queryOrders 返回）") String orderId
    ) {
        Long userId = requireUserId(sessionId);
        Long orderIdLong = parseLong(orderId);
        if (orderIdLong == null) {
            return toJson(Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "订单ID无效，请从 queryOrders 返回结果中获取有效订单ID"));
        }
        String requestId = getRequestId(sessionId);
        log.info("[Tool:refundOrder] sessionId={}, userId={}, orderId={}, requestId={}", sessionId, userId, orderIdLong, requestId);

        String cached = idempotentService.getIfPresent(userId, requestId, String.class);
        if (cached != null) {
            log.info("[Tool:refundOrder] 幂等命中缓存: requestId={}", requestId);
            return cached;
        }

        Result<Object> result = ticketClient.refundOrder(userId, orderIdLong, requestId);
        String json = toJson(result);
        if (result.getCode() == 0) {
            idempotentService.put(userId, requestId, json);
        }
        // 清空已有卡片并抑制后续卡片，确保退票后本轮不推送任何卡片
        cardBufferOf(sessionId).clear();
        cardSuppressedFlags.put(sessionId, true);
        return json;
    }

    // ========== 用户偏好工具 ==========

    @Tool("获取当前用户的偏好设置，包括影厅类型、价格范围、座位区域、影片类型。返回 JSON 数据。")
    public String getUserPreference(
            @ToolMemoryId String sessionId
    ) {
        Long userId = requireUserId(sessionId);
        log.info("[Tool:getUserPreference] sessionId={}, userId={}", sessionId, userId);
        var doc = userPreferenceService.getPreference(userId);
        return toJson(doc);
    }

    @Tool("更新用户的偏好设置。当用户在对话中表达偏好时调用（如'我喜欢看喜剧'、'预算50以内'、'想坐中间排'）。仅传入用户明确表达的字段，未提及的字段传空字符串/null。")
    public String updateUserPreference(
            @ToolMemoryId String sessionId,
            @P("偏好的影厅类型，如'IMAX'、'杜比'；未提及传空字符串") String preferredHallType,
            @P("偏好价格下限（元），如'30'；未提及传空字符串") String priceMin,
            @P("偏好价格上限（元），如'80'；未提及传空字符串") String priceMax,
            @P("偏好的座位区域，如'5-8排中间'；未提及传空字符串") String preferredSeatArea,
            @P("偏好的影片类型，多个用逗号分隔，如'科幻,喜剧'；未提及传空字符串") String preferredMovieTypes
    ) {
        Long userId = requireUserId(sessionId);
        PreferenceUpdateDTO.PreferenceUpdateDTOBuilder builder = PreferenceUpdateDTO.builder();
        if (preferredHallType != null && !preferredHallType.isBlank()) {
            builder.preferredHallType(preferredHallType);
        }
        if (priceMin != null && !priceMin.isBlank()) {
            try { builder.priceMin(new BigDecimal(priceMin.trim())); }
            catch (NumberFormatException e) { log.warn("[Tool:updateUserPreference] priceMin 格式无效: {}", priceMin); }
        }
        if (priceMax != null && !priceMax.isBlank()) {
            try { builder.priceMax(new BigDecimal(priceMax.trim())); }
            catch (NumberFormatException e) { log.warn("[Tool:updateUserPreference] priceMax 格式无效: {}", priceMax); }
        }
        if (preferredSeatArea != null && !preferredSeatArea.isBlank()) {
            builder.preferredSeatArea(preferredSeatArea);
        }
        if (preferredMovieTypes != null && !preferredMovieTypes.isBlank()) {
            builder.preferredMovieTypes(Arrays.stream(preferredMovieTypes.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList());
        }
        PreferenceUpdateDTO dto = builder.build();
        log.info("[Tool:updateUserPreference] sessionId={}, userId={}, dto={}", sessionId, userId, dto);
        userPreferenceService.mergePreference(userId, dto);
        return "{\"code\":0,\"message\":\"偏好已更新\"}";
    }

    // ========== 行程规划工具 ==========

    @Tool("路径规划。用户问怎么去影院/导航/路线时调用。同时查询驾车和公交两种方案，返回原始 JSON 数据。")
    public String planRoute(
            @ToolMemoryId String sessionId,
            @P("出发地，可为地点名称、地址或坐标（经度,纬度），如'湖南大学'、'长沙南站'、'113.008977,28.233355'；当上下文存在【用户位置】时直接使用其坐标") String origin,
            @P("目的地名称或地址，如'长沙学院'或影院名称") String destination,
            @P("出行方式：driving(驾车)/transit(公交)/walking(步行)；用户未指定时传空字符串，将同时查询驾车和公交") String mode
    ) {
        String travelMode = (mode == null || mode.isBlank()) ? "all" : mode.trim().toLowerCase();
        log.info("[Tool:路径规划] sessionId={}, origin={}, destination={}, mode={}", sessionId, origin, destination, travelMode);

        // 先将出发地和目的地地理编码为坐标
        String originCoords = resolveCoordinates(origin);
        String destCoords = resolveCoordinates(destination);
        if (originCoords == null) {
            return "{\"code\":500,\"message\":\"无法解析出发地坐标：" + origin + "\"}";
        }
        if (destCoords == null) {
            return "{\"code\":500,\"message\":\"无法解析目的地坐标：" + destination + "\"}";
        }

        // 查询单一模式或全部模式
        List<String> modes;
        if ("all".equals(travelMode)) {
            modes = List.of("driving", "transit");
        } else {
            modes = List.of(travelMode);
        }

        // 并行调用多种出行方式（虚拟线程）
        var results = new ConcurrentHashMap<String, String>();
        var threads = new ArrayList<Thread>();
        for (String m : modes) {
            final String modeKey = m;
            var t = Thread.startVirtualThread(() -> {
                String city = "transit".equals(modeKey) ? "长沙" : null;
                results.put(modeKey, amapClient.getRoute(originCoords, destCoords, modeKey, city));
            });
            threads.add(t);
        }
        for (Thread t : threads) {
            try { t.join(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }

        // 按固定顺序聚合（driving 优先于 transit）
        String combined;
        if (results.size() == 1) {
            combined = results.values().iterator().next();
        } else {
            try {
                var combinedObj = new LinkedHashMap<String, Object>();
                combinedObj.put("code", 200);
                for (String m : modes) {
                    String r = results.get(m);
                    if (r == null) continue;
                    try {
                        var parsed = objectMapper.readTree(r);
                        combinedObj.put(m, parsed.has("data") ? parsed.get("data") : parsed);
                    } catch (Exception e) {
                        combinedObj.put(m, r);
                    }
                }
                combined = objectMapper.writeValueAsString(combinedObj);
            } catch (Exception e) {
                log.warn("[Tool:planRoute] 聚合结果失败，返回驾车结果: {}", e.getMessage());
                combined = results.get("driving");
            }
        }
        emitParsedCard(sessionId, "route_info", combined);
        return combined;
    }

    @Tool("周边搜索。用户问影院附近有什么（餐饮/停车/地铁等）时调用。先通过地理编码将地名转为坐标，再调用高德周边搜索。返回原始 JSON 数据。")
    public String searchNearby(
            @ToolMemoryId String sessionId,
            @P("中心地点，可为名称、地址或坐标（经度,纬度），如'长沙学院'、'113.008977,28.233355'；当上下文存在【用户位置】时直接使用其坐标") String location,
            @P("搜索关键词，如'餐厅'、'停车场'、'地铁站'；无特定要求时传空字符串") String keywords
    ) {
        log.info("[Tool:周边搜索] sessionId={}, location={}, keywords={}", sessionId, location, keywords);
        String coords = resolveCoordinates(location);
        if (coords == null) {
            return "{\"code\":500,\"message\":\"无法解析地点坐标：" + location + "\"}";
        }
        String result = amapClient.searchNearby(coords, keywords, 1000);
        emitParsedCard(sessionId, "nearby_poi", result);
        return result;
    }

    @Tool("天气查询。用户问观影当天天气时调用。返回原始 JSON 数据。")
    public String getWeather(
            @ToolMemoryId String sessionId,
            @P("城市名称，如'长沙'。用户未指定城市时，根据上下文影院所在城市推断；无上下文时默认'长沙'") String city
    ) {
        if (city == null || city.isBlank()) {
            city = "长沙";
        }
        log.info("[Tool:天气查询] sessionId={}, city={}", sessionId, city);
        String result = amapClient.getWeather(city);
        emitParsedCard(sessionId, "weather_info", result);
        return result;
    }

    /**
     * 将地名/地址解析为坐标（经度,纬度）。
     * 先查影院表（有预存坐标），未命中再调高德地理编码。
     */
    private static final Pattern COORD_PATTERN =
            Pattern.compile("^-?\\d+\\.\\d+,-?\\d+\\.\\d+$");

    private String resolveCoordinates(String placeName) {
        if (placeName == null || placeName.isBlank()) return null;
        // 已是坐标格式则直接返回
        String trimmed = placeName.trim();
        if (COORD_PATTERN.matcher(trimmed).matches()) {
            return trimmed;
        }
        // 尝试从影院表查坐标
        Result<Object> cinemaResult = ticketClient.searchCinemas(null, placeName, null);
        if (cinemaResult.getCode() == 0) {
            try {
                var node = objectMapper.readTree(objectMapper.writeValueAsString(cinemaResult.getData()));
                var records = node.path("records");
                if (records.isArray() && !records.isEmpty()) {
                    var cinema = records.get(0);
                    String lng = cinema.path("longitude").asString(null);
                    String lat = cinema.path("latitude").asString(null);
                    if (lng != null && lat != null && !lng.equals("null") && !lat.equals("null")) {
                        return lng + "," + lat;
                    }
                }
            } catch (Exception e) {
                log.warn("[resolveCoordinates] 解析影院坐标失败: {}", e.getMessage());
            }
        }
        // 调高德地理编码
        String geocodeResult = amapClient.geocode(placeName, "长沙");
        try {
            var node = objectMapper.readTree(geocodeResult);
            if (node.path("code").asInt(-1) == 200) {
                var data = node.path("data");
                if (data.isArray() && !data.isEmpty()) {
                    String lng = data.get(0).path("longitude").asString(null);
                    String lat = data.get(0).path("latitude").asString(null);
                    if (lng != null && lat != null) {
                        return lng + "," + lat;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[resolveCoordinates] 地理编码解析失败: {}", e.getMessage());
        }
        return null;
    }
}
