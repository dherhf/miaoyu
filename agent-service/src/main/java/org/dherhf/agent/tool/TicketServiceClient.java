package org.dherhf.agent.tool;

import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.feign.TicketFeignClient;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.common.result.Result;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 票务服务客户端，封装对 ticket-service 的 /internal 接口调用。
 * <p>
 * 通过 {@link TicketFeignClient}（OpenFeign）发起远程调用，
 * Feign 异常被捕获后包装为 {@link BusinessException} 抛出，由上层 Tool 方法的 catch 块统一处理。
 * </p>
 */
@Slf4j
@Component
public class TicketServiceClient {

    private final TicketFeignClient feignClient;

    public TicketServiceClient(TicketFeignClient feignClient) {
        this.feignClient = feignClient;
    }

    /**
     * 查询影片列表。
     * <p>
     * 调用 ticket-service {@code GET /internal/movies}，支持按片名关键词、类型标签、影院 ID 筛选。
     * 空白字符串参数会被转为 null 传给 Feign，避免发送空串。
     * </p>
     *
     * @param keyword  影片名称关键词，如 "流浪地球3"；无约束时传空字符串
     * @param type     影片类型标签（英文枚举），如 "comedy"；无约束时传空字符串
     * @param cinemaId 影院 ID，按影院查影片时传入；无约束时传 null
     * @return {@code Result<Object>}，data 为分页影片数据；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> searchMovies(String keyword, String type, Long cinemaId) {
        try {
            return feignClient.searchMovies(
                    blankToNull(keyword),
                    blankToNull(type),
                    cinemaId
            );
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "影片查询失败：" + ex.getMessage());
        }
    }

    /**
     * 查询影院列表。
     * <p>
     * 调用 ticket-service {@code GET /internal/cinemas}，支持按名称关键词、设施要求筛选。
     * 空白字符串参数会被转为 null 传给 Feign。
     * </p>
     *
     * @param keyword    影院名称关键词，如 "万达影城"；无约束时传空字符串
     * @param facilities 设施要求，如 "IMAX"；无要求时传空字符串
     * @return {@code Result<Object>}，data 为分页影院数据；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> searchCinemas(String keyword, String facilities) {
        try {
            return feignClient.searchCinemas(
                    blankToNull(keyword),
                    blankToNull(facilities)
            );
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "影院查询失败：" + ex.getMessage());
        }
    }

    /**
     * 查询场次列表。
     * <p>
     * 调用 ticket-service {@code GET /internal/sessions}，根据影片 ID + 影院 ID + 放映日期获取可售场次。
     * 日期参数为空时由 ticket-service 默认查询当天。
     * </p>
     *
     * @param movieId 影片 ID（由 searchMovies 返回）
     * @param cinemaId 影院 ID（由 searchCinemas 返回）
     * @param date    放映日期（已解析为 yyyy-MM-dd）；用户未指定时传空字符串
     * @return {@code Result<Object>}，data 为分页场次数据；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> searchSessions(Long movieId, Long cinemaId, String date) {
        try {
            return feignClient.searchSessions(movieId, cinemaId, blankToNull(date));
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "场次查询失败：" + ex.getMessage());
        }
    }

    /**
     * 获取座位图。
     * <p>
     * 调用 ticket-service {@code GET /internal/sessions/{sessionId}/seats}，返回该场次全部座位的状态
     * （available / locked / sold）。
     * </p>
     *
     * @param sessionId 场次 ID（由 searchSessions 返回）
     * @return {@code Result<Object>}，data 为座位图数据；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> getSeatMap(Long sessionId) {
        try {
            return feignClient.getSeatMap(sessionId);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "座位图获取失败：" + ex.getMessage());
        }
    }

    /**
     * 查询当前用户的订单列表。
     * <p>
     * 调用 ticket-service {@code GET /internal/orders}，支持按订单状态筛选。
     * status 为空时查询全部状态订单。
     * </p>
     *
     * @param userId 用户 ID（由请求上下文获取）
     * @param status 订单状态过滤，如 "pending"（待支付）、"paid"（已支付）、"refunded"（已退票）；查全部传空字符串
     * @return {@code Result<Object>}，data 为订单列表数据；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> queryUserOrders(Long userId, String status) {
        try {
            return feignClient.queryUserOrders(userId, blankToNull(status));
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "订单查询失败：" + ex.getMessage());
        }
    }

    /**
     * 查询订单详情。
     * <p>
     * 调用 ticket-service {@code GET /internal/orders/{orderId}}，附带 userId 做归属校验，
     * 确保用户只能查看自己的订单。
     * </p>
     *
     * @param orderId 订单 ID（由 queryUserOrders 返回）
     * @param userId  用户 ID（由请求上下文获取）
     * @return {@code Result<Object>}，data 为订单详情数据；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> queryOrderDetail(Long orderId, Long userId) {
        try {
            return feignClient.queryOrderDetail(orderId, userId);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "订单详情获取失败：" + ex.getMessage());
        }
    }

    /**
     * 锁座并创建订单。
     * <p>
     * 调用 ticket-service {@code POST /internal/orders/lock-seat}，传入用户 ID、场次 ID、座位 ID 列表、
     * 购票数量和幂等 requestId。ticket-service 会锁定目标座位并创建待支付订单。
     * </p>
     *
     * @param userId       用户 ID（由请求上下文获取）
     * @param scheduleId   场次 ID（前端选场次后直接提供）
     * @param seatIds      座位 ID 列表（前端选座后直接提供）
     * @param ticketCount  购票数量（= 座位数）
     * @param requestId    幂等请求 ID（前端透传，缺失时兜底生成 UUID）
     * @return {@code Result<Object>}，data 为订单确认卡片数据；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> lockSeat(Long userId, Long scheduleId, List<Long> seatIds, Integer ticketCount, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "scheduleId", scheduleId,
                    "seatIds", seatIds,
                    "ticketCount", ticketCount,
                    "requestId", requestId
            );
            return feignClient.lockSeat(body);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "锁座下单失败：" + ex.getMessage());
        }
    }

    /**
     * 支付订单。
     * <p>
     * 调用 ticket-service {@code POST /internal/orders/{orderId}/pay}，传入用户 ID 和幂等 requestId。
     * ticket-service 会完成支付并返回取票码，仅待支付订单可支付。
     * </p>
     *
     * @param userId    用户 ID（由请求上下文获取）
     * @param orderId   订单 ID（由 queryUserOrders 或 lockSeat 返回）
     * @param requestId 幂等请求 ID（前端透传，缺失时兜底生成 UUID）
     * @return {@code Result<Object>}，data 为支付结果（含取票码）；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> payOrder(Long userId, Long orderId, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "requestId", requestId
            );
            return feignClient.payOrder(orderId, body);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "支付订单失败：" + ex.getMessage());
        }
    }

    /**
     * 取消待支付订单。
     * <p>
     * 调用 ticket-service {@code POST /internal/orders/{orderId}/cancel}，传入用户 ID 和幂等 requestId。
     * ticket-service 会释放已锁定的座位，仅待支付订单可取消。
     * </p>
     *
     * @param userId    用户 ID（由请求上下文获取）
     * @param orderId   订单 ID（由 queryUserOrders 返回）
     * @param requestId 幂等请求 ID（前端透传，缺失时兜底生成 UUID）
     * @return {@code Result<Object>}，data 为取消结果；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> cancelOrder(Long userId, Long orderId, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "requestId", requestId
            );
            return feignClient.cancelOrder(orderId, body);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "取消订单失败：" + ex.getMessage());
        }
    }

    /**
     * 退票。
     * <p>
     * 调用 ticket-service {@code POST /internal/orders/{orderId}/refund}，传入用户 ID 和幂等 requestId。
     * ticket-service 会释放已售座位并退款，仅已出票且未放映的订单可退。
     * </p>
     *
     * @param userId    用户 ID（由请求上下文获取）
     * @param orderId   订单 ID（由 queryUserOrders 返回）
     * @param requestId 幂等请求 ID（前端透传，缺失时兜底生成 UUID）
     * @return {@code Result<Object>}，data 为退票结果；调用失败时 code 非 0 并携带错误信息
     */
    public Result<Object> refundOrder(Long userId, Long orderId, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "requestId", requestId
            );
            return feignClient.refundOrder(orderId, body);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCodeEnum.TOOL_ERROR.getCode(), "退票失败：" + ex.getMessage());
        }
    }

    /**
     * 空白字符串转 null，避免 Feign 发送空串参数。
     *
     * @param s 待处理字符串
     * @return null（当 s 为 null 或空白时）或原字符串
     */
    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
