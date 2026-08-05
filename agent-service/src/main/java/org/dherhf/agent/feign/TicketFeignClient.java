package org.dherhf.agent.feign;

import org.dherhf.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

/**
 * ticket-service 内部接口 Feign 客户端。
 * <p>
 * 对应 ticket-service 的 4 个 InternalController：
 * InternalMovieController、InternalCinemaController、InternalScheduleController、InternalOrderController。
 * </p>
 */
@FeignClient(name = "ticket-service", url = "${ticket-service.base-url}")
public interface TicketFeignClient {

    // ========== 影片 ==========

    @GetMapping("/internal/movies")
    Result<Object> searchMovies(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type
    );

    // ========== 影院 ==========

    @GetMapping("/internal/cinemas")
    Result<Object> searchCinemas(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String facilities
    );

    // ========== 场次 ==========

    @GetMapping("/internal/sessions")
    Result<Object> searchSessions(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) String date
    );

    @GetMapping("/internal/sessions/{id}/seats")
    Result<Object> getSeatMap(@PathVariable("id") Long sessionId);

    // ========== 订单 ==========

    @GetMapping("/internal/orders")
    Result<Object> queryUserOrders(
            @RequestParam Long userId,
            @RequestParam(required = false) String status
    );

    @GetMapping("/internal/orders/{id}")
    Result<Object> queryOrderDetail(
            @PathVariable("id") Long orderId,
            @RequestParam Long userId
    );

    @PostMapping("/internal/orders/lock-seat")
    Result<Object> lockSeat(@RequestBody Map<String, Object> body);

    @PostMapping("/internal/orders/{id}/pay")
    Result<Object> payOrder(
            @PathVariable("id") Long orderId,
            @RequestBody Map<String, Object> body
    );

    @PostMapping("/internal/orders/{id}/cancel")
    Result<Object> cancelOrder(
            @PathVariable("id") Long orderId,
            @RequestBody Map<String, Object> body
    );

    @PostMapping("/internal/orders/{id}/refund")
    Result<Object> refundOrder(
            @PathVariable("id") Long orderId,
            @RequestBody Map<String, Object> body
    );
}
