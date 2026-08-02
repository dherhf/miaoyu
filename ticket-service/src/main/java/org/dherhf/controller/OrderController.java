package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.LockSeatDTO;
import org.dherhf.service.OrderService;
import org.dherhf.vo.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "订单管理(用户端)", description = "锁座/支付/取消/退票/查询")
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "锁座下单")
    @PostMapping("/lock-seat")
    public Result<LockSeatResultVO> lockSeat(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @RequestBody LockSeatDTO dto) {
        return orderService.lockSeat(userId, dto, requestId);
    }

    @Operation(summary = "支付订单")
    @PostMapping("/{id}/pay")
    public Result<PayResultVO> pay(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @PathVariable Long id) {
        return orderService.payOrder(userId, id, requestId);
    }

    @Operation(summary = "取消订单")
    @PutMapping("/{id}/cancel")
    public Result<Void> cancel(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @PathVariable Long id) {
        return orderService.cancelOrder(userId, id, requestId);
    }

    @Operation(summary = "退票")
    @PostMapping("/{id}/refund")
    public Result<Void> refund(
            @RequestAttribute("userId") Long userId,
            @RequestHeader("X-Request-Id") String requestId,
            @PathVariable Long id) {
        return orderService.refundOrder(userId, id, requestId);
    }

    @Operation(summary = "订单列表")
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

    @Operation(summary = "订单详情")
    @GetMapping("/{id}")
    public Result<OrderDetailVO> detail(
            @RequestAttribute("userId") Long userId,
            @PathVariable Long id) {
        return orderService.detail(userId, id);
    }

    @Operation(summary = "待支付订单")
    @GetMapping("/pending")
    public Result<PendingOrderVO> pending(@RequestAttribute("userId") Long userId) {
        return orderService.pendingOrder(userId);
    }

    @Operation(summary = "订单剩余支付时间")
    @GetMapping("/{id}/remaining-time")
    public Result<RemainingTimeVO> remainingTime(
            @RequestAttribute("userId") Long userId,
            @PathVariable Long id) {
        return orderService.remainingTime(userId, id);
    }
}
