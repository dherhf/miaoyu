package org.dherhf.agent.tool;

import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.feign.TicketFeignClient;
import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.common.result.Result;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 票务服务客户端，封装对 ticket-service 的 /internal 接口调用。
 * <p>
 * 通过 {@link TicketFeignClient}（OpenFeign）发起远程调用，
 * 统一捕获异常并返回 {@link Result} 包装，上层 Tool 方法据此判断调用是否成功。
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
     * GET /internal/movies?keyword={}&type={}&cinemaId={}
     */
    public Result<Object> searchMovies(String keyword, String type, Long cinemaId) {
        try {
            return feignClient.searchMovies(
                    blankToNull(keyword),
                    blankToNull(type),
                    cinemaId
            );
        } catch (Exception ex) {
            log.error("[searchMovies] 调用 ticket-service 失败: keyword={}, type={}, cinemaId={}", keyword, type, cinemaId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "影片查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/cinemas?keyword={}&facilities={}
     */
    public Result<Object> searchCinemas(String keyword, String facilities) {
        try {
            return feignClient.searchCinemas(
                    blankToNull(keyword),
                    blankToNull(facilities)
            );
        } catch (Exception ex) {
            log.error("[searchCinemas] 调用 ticket-service 失败: keyword={}, facilities={}", keyword, facilities, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "影院查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/sessions?movieId={}&cinemaId={}&date={}
     */
    public Result<Object> searchSessions(Long movieId, Long cinemaId, String date) {
        try {
            return feignClient.searchSessions(movieId, cinemaId, blankToNull(date));
        } catch (Exception ex) {
            log.error("[searchSessions] 调用 ticket-service 失败: movieId={}, cinemaId={}, date={}", movieId, cinemaId, date, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "场次查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/sessions/{id}/seats
     */
    public Result<Object> getSeatMap(Long sessionId) {
        try {
            return feignClient.getSeatMap(sessionId);
        } catch (Exception ex) {
            log.error("[getSeatMap] 调用 ticket-service 失败: sessionId={}", sessionId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "座位图获取失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/orders?userId={}&status={}
     */
    public Result<Object> queryUserOrders(Long userId, String status) {
        try {
            return feignClient.queryUserOrders(userId, blankToNull(status));
        } catch (Exception ex) {
            log.error("[queryUserOrders] 调用 ticket-service 失败: userId={}, status={}", userId, status, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "订单查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/orders/{id}?userId={}
     */
    public Result<Object> queryOrderDetail(Long orderId, Long userId) {
        try {
            return feignClient.queryOrderDetail(orderId, userId);
        } catch (Exception ex) {
            log.error("[queryOrderDetail] 调用 ticket-service 失败: orderId={}, userId={}", orderId, userId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "订单详情获取失败：" + ex.getMessage());
        }
    }

    /**
     * POST /internal/orders/lock-seat
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
            log.error("[lockSeat] 调用 ticket-service 失败: userId={}, scheduleId={}, seatIds={}", userId, scheduleId, seatIds, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "锁座下单失败：" + ex.getMessage());
        }
    }

    /**
     * POST /internal/orders/{id}/pay
     */
    public Result<Object> payOrder(Long userId, Long orderId, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "requestId", requestId
            );
            return feignClient.payOrder(orderId, body);
        } catch (Exception ex) {
            log.error("[payOrder] 调用 ticket-service 失败: userId={}, orderId={}", userId, orderId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "支付订单失败：" + ex.getMessage());
        }
    }

    /**
     * POST /internal/orders/{id}/cancel
     */
    public Result<Object> cancelOrder(Long userId, Long orderId, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "requestId", requestId
            );
            return feignClient.cancelOrder(orderId, body);
        } catch (Exception ex) {
            log.error("[cancelOrder] 调用 ticket-service 失败: userId={}, orderId={}", userId, orderId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "取消订单失败：" + ex.getMessage());
        }
    }

    /**
     * POST /internal/orders/{id}/refund
     */
    public Result<Object> refundOrder(Long userId, Long orderId, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "requestId", requestId
            );
            return feignClient.refundOrder(orderId, body);
        } catch (Exception ex) {
            log.error("[refundOrder] 调用 ticket-service 失败: userId={}, orderId={}", userId, orderId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR, "退票失败：" + ex.getMessage());
        }
    }

    /**
     * 空白字符串转 null，避免 Feign 发送空串参数。
     */
    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
