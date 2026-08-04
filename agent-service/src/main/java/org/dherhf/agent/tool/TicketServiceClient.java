package org.dherhf.agent.tool;

import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.common.ErrorCodeEnum;
import org.dherhf.common.result.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * 票务服务 HTTP 客户端，封装对 ticket-service 的 /internal 接口调用。
 * <p>
 * 所有方法返回 {@link Result} 包装，上层 Tool 方法据此判断调用是否成功。
 * </p>
 */
@Slf4j
@Component
public class TicketServiceClient {

    private final RestClient restClient;

    @Autowired
    public TicketServiceClient(RestClient ticketRestClient) {
        this.restClient = ticketRestClient;
    }

    /**
     * GET /internal/movies?keyword={}&type={}
     */
    public Result<Object> searchMovies(String keyword, String type) {
        try {
            return restClient.get()
                    .uri(builder -> {
                        builder.path("/internal/movies");
                        if (keyword != null && !keyword.isBlank()) {
                            builder.queryParam("keyword", keyword);
                        }
                        if (type != null && !type.isBlank()) {
                            builder.queryParam("type", type);
                        }
                        return builder.build();
                    })
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[searchMovies] 调用 ticket-service 失败: keyword={}, type={}", keyword, type, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "影片查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/cinemas?keyword={}&facilities={}
     */
    public Result<Object> searchCinemas(String keyword, String facilities) {
        try {
            return restClient.get()
                    .uri(builder -> {
                        builder.path("/internal/cinemas");
                        if (keyword != null && !keyword.isBlank()) {
                            builder.queryParam("keyword", keyword);
                        }
                        if (facilities != null && !facilities.isBlank()) {
                            builder.queryParam("facilities", facilities);
                        }
                        return builder.build();
                    })
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[searchCinemas] 调用 ticket-service 失败: keyword={}, facilities={}", keyword, facilities, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "影院查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/sessions?movieId={}&cinemaId={}&date={}
     */
    public Result<Object> searchSessions(Long movieId, Long cinemaId, String date) {
        try {
            return restClient.get()
                    .uri(builder -> {
                        builder.path("/internal/sessions");
                        if (movieId != null) {
                            builder.queryParam("movieId", movieId);
                        }
                        if (cinemaId != null) {
                            builder.queryParam("cinemaId", cinemaId);
                        }
                        if (date != null && !date.isBlank()) {
                            builder.queryParam("date", date);
                        }
                        return builder.build();
                    })
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[searchSessions] 调用 ticket-service 失败: movieId={}, cinemaId={}, date={}", movieId, cinemaId, date, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "场次查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/sessions/{id}/seats
     */
    public Result<Object> getSeatMap(Long sessionId) {
        try {
            return restClient.get()
                    .uri("/internal/sessions/{id}/seats", sessionId)
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[getSeatMap] 调用 ticket-service 失败: sessionId={}", sessionId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "座位图获取失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/orders?userId={}&status={}
     */
    public Result<Object> queryUserOrders(Long userId, String status) {
        try {
            return restClient.get()
                    .uri(builder -> {
                        builder.path("/internal/orders").queryParam("userId", userId);
                        if (status != null && !status.isBlank()) {
                            builder.queryParam("status", status);
                        }
                        return builder.build();
                    })
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[queryUserOrders] 调用 ticket-service 失败: userId={}, status={}", userId, status, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "订单查询失败：" + ex.getMessage());
        }
    }

    /**
     * GET /internal/orders/{id}?userId={}
     */
    public Result<Object> queryOrderDetail(Long orderId, Long userId) {
        try {
            return restClient.get()
                    .uri(builder -> builder.path("/internal/orders/{id}").queryParam("userId", userId).build(orderId))
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[queryOrderDetail] 调用 ticket-service 失败: orderId={}, userId={}", orderId, userId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "订单详情获取失败：" + ex.getMessage());
        }
    }

    /**
     * POST /internal/orders/lock-seat
     */
    public Result<Object> lockSeat(Long userId, Long scheduleId, java.util.List<Long> seatIds, Integer ticketCount, String requestId) {
        try {
            Map<String, Object> body = Map.of(
                    "userId", userId,
                    "scheduleId", scheduleId,
                    "seatIds", seatIds,
                    "ticketCount", ticketCount,
                    "requestId", requestId
            );
            return restClient.post()
                    .uri("/internal/orders/lock-seat")
                    .body(body)
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[lockSeat] 调用 ticket-service 失败: userId={}, scheduleId={}, seatIds={}", userId, scheduleId, seatIds, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "锁座下单失败：" + ex.getMessage());
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
            return restClient.post()
                    .uri("/internal/orders/{id}/pay", orderId)
                    .body(body)
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[payOrder] 调用 ticket-service 失败: userId={}, orderId={}", userId, orderId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "支付订单失败：" + ex.getMessage());
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
            return restClient.post()
                    .uri("/internal/orders/{id}/cancel", orderId)
                    .body(body)
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[cancelOrder] 调用 ticket-service 失败: userId={}, orderId={}", userId, orderId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "取消订单失败：" + ex.getMessage());
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
            return restClient.post()
                    .uri("/internal/orders/{id}/refund", orderId)
                    .body(body)
                    .retrieve()
                    .body(Result.class);
        } catch (Exception ex) {
            log.error("[refundOrder] 调用 ticket-service 失败: userId={}, orderId={}", userId, orderId, ex);
            return Result.error(ErrorCodeEnum.TOOL_ERROR.getCode(), "退票失败：" + ex.getMessage());
        }
    }
}
