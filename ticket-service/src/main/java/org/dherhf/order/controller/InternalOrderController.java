package org.dherhf.order.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.order.dto.InternalLockSeatDTO;
import org.dherhf.order.service.OrderService;
import org.dherhf.order.vo.LockSeatResultVO;
import org.dherhf.order.vo.OrderDetailVO;
import org.dherhf.order.vo.OrderListVO;
import org.dherhf.order.vo.PayResultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 订单内部接口控制器。
 * <p>
 * 供 Agent 服务内部调用，提供锁座下单、支付、订单查询、取消、退票等能力，
 * 所有接口路径以 /internal 为前缀，与用户端接口逻辑复用 OrderService。
 */
@Tag(name = "订单内部接口", description = "Agent调用的订单接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderService orderService;

    /**
     * 内部锁座下单：直接为用户创建待支付订单并锁定座位。
     *
     * @param dto 内部锁座请求 DTO（含用户ID、场次、座位、幂等ID）
     * @return 锁座结果（含订单ID与剩余支付时间）
     */
    @Operation(summary = "内部锁座下单")
    @PostMapping("/orders/lock-seat")
    public Result<LockSeatResultVO> lockSeat(@RequestBody InternalLockSeatDTO dto) {
        return Result.success(orderService.internalLockSeat(dto));
    }

    /**
     * 内部支付订单：通过 self 代理调用 {@link OrderService#payOrder}。
     *
     * @param id      订单 ID
     * @param request 内部支付请求（含用户ID与幂等请求ID）
     * @return 支付结果（含取票码）
     */
    @Operation(summary = "内部支付订单")
    @PostMapping("/orders/{id}/pay")
    public Result<PayResultVO> pay(
            @Parameter(description = "订单 ID") @PathVariable Long id,
            @RequestBody InternalPayRequest request) {
        return Result.success(orderService.internalPayOrder(request.getUserId(), id, request.getRequestId()));
    }

    /**
     * 内部订单列表：按用户ID分页查询订单，支持模糊搜索与状态/日期筛选。
     *
     * @param userId   用户 ID
     * @param keyword  搜索关键词（可选）
     * @param status   订单状态（可选）
     * @param dateFrom 开始日期（可选）
     * @param dateTo   结束日期（可选）
     * @param page     页码，默认 1
     * @param size     每页条数，默认 20
     * @return 分页的订单列表结果
     */
    @Operation(summary = "内部订单列表")
    @GetMapping("/orders")
    public Result<PageResult<OrderListVO>> list(
            @Parameter(description = "用户 ID") @RequestParam Long userId,
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "订单状态") @RequestParam(required = false) String status,
            @Parameter(description = "开始日期") @RequestParam(required = false) String dateFrom,
            @Parameter(description = "结束日期") @RequestParam(required = false) String dateTo,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(orderService.internalListOrders(userId, keyword, status, dateFrom, dateTo, page, size));
    }

    /**
     * 内部订单详情：获取指定订单的详细信息（含取票码）。
     *
     * @param id     订单 ID
     * @param userId 用户 ID（用于鉴权校验）
     * @return 订单详情视图对象
     */
    @Operation(summary = "内部订单详情")
    @GetMapping("/orders/{id}")
    public Result<OrderDetailVO> detail(
            @Parameter(description = "订单 ID") @PathVariable Long id,
            @Parameter(description = "用户 ID") @RequestParam Long userId) {
        return Result.success(orderService.detail(userId, id));
    }

    /**
     * 内部取消订单：通过 self 代理调用 {@link OrderService#cancelOrder}。
     *
     * @param id      订单 ID
     * @param request 内部取消请求（含用户ID与幂等请求ID）
     * @return 无返回值
     */
    @Operation(summary = "内部取消订单")
    @PostMapping("/orders/{id}/cancel")
    public Result<Void> cancel(
            @Parameter(description = "订单 ID") @PathVariable Long id,
            @RequestBody InternalCancelRequest request) {
        orderService.internalCancelOrder(request.getUserId(), id, request.getRequestId());
        return Result.success();
    }

    /**
     * 内部退票：通过 self 代理调用 {@link OrderService#refundOrder}。
     *
     * @param id      订单 ID
     * @param request 内部取消请求（含用户ID与幂等请求ID）
     * @return 无返回值
     */
    @Operation(summary = "内部退票")
    @PostMapping("/orders/{id}/refund")
    public Result<Void> refund(
            @Parameter(description = "订单 ID") @PathVariable Long id,
            @RequestBody InternalCancelRequest request) {
        orderService.internalRefundOrder(request.getUserId(), id, request.getRequestId());
        return Result.success();
    }

    /**
     * 内部支付请求体，包含用户ID与幂等请求ID。
     */
    @lombok.Data
    public static class InternalPayRequest {
        private Long userId;
        private String requestId;
    }

    /**
     * 内部取消/退票请求体，包含用户ID与幂等请求ID。
     */
    @lombok.Data
    public static class InternalCancelRequest {
        private Long userId;
        private String requestId;
    }
}
