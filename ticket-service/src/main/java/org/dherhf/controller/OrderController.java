package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.LockSeatDTO;
import org.dherhf.service.OrderService;
import org.dherhf.vo.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/lock-seat")
    public Result<LockSeatResultVO> lockSeat(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @RequestBody LockSeatDTO dto) {
        return orderService.lockSeat(userId, dto, requestId);
    }

    @PostMapping("/{id}/pay")
    public Result<PayResultVO> pay(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @PathVariable Long id) {
        return orderService.payOrder(userId, id, requestId);
    }

    @PutMapping("/{id}/cancel")
    public Result<Void> cancel(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @PathVariable Long id) {
        return orderService.cancelOrder(userId, id, requestId);
    }

    @PostMapping("/{id}/refund")
    public Result<Void> refund(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @PathVariable Long id) {
        return orderService.refundOrder(userId, id, requestId);
    }

    @GetMapping
    public Result<PageResult<OrderListVO>> list(
            @RequestAttribute("userId") Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return orderService.listOrders(userId, status, dateFrom, dateTo, keyword, page, size);
    }

    @GetMapping("/{id}")
    public Result<OrderDetailVO> detail(
            @RequestAttribute("userId") Long userId,
            @PathVariable Long id) {
        return orderService.detail(userId, id);
    }

    @GetMapping("/pending")
    public Result<PendingOrderVO> pending(@RequestAttribute("userId") Long userId) {
        return orderService.pendingOrder(userId);
    }

    @GetMapping("/{id}/remaining-time")
    public Result<RemainingTimeVO> remainingTime(
            @RequestAttribute("userId") Long userId,
            @PathVariable Long id) {
        return orderService.remainingTime(userId, id);
    }
}
