package org.dherhf.order.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.order.dto.InternalLockSeatDTO;
import org.dherhf.order.service.OrderService;
import org.dherhf.order.vo.LockSeatResultVO;
import org.dherhf.order.vo.OrderListVO;
import org.dherhf.order.vo.PayResultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "订单内部接口", description = "Agent调用的订单接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderService orderService;

    @Operation(summary = "内部锁座下单")
    @PostMapping("/orders/lock-seat")
    public Result<LockSeatResultVO> lockSeat(@RequestBody InternalLockSeatDTO dto) {
        return orderService.internalLockSeat(dto);
    }

    @Operation(summary = "内部支付订单")
    @PostMapping("/orders/{id}/pay")
    public Result<PayResultVO> pay(
            @PathVariable Long id,
            @RequestBody InternalPayRequest request) {
        return orderService.internalPayOrder(request.getUserId(), id, request.getRequestId());
    }

    @Operation(summary = "内部订单列表")
    @GetMapping("/orders")
    public Result<PageResult<OrderListVO>> list(
            @RequestParam Long userId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return orderService.internalListOrders(userId, keyword, status, dateFrom, dateTo, page, size);
    }

    @lombok.Data
    public static class InternalPayRequest {
        private Long userId;
        private String requestId;
    }
}
