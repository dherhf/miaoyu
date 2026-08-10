package org.dherhf.order.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.order.dto.LockSeatDTO;
import org.dherhf.order.service.OrderService;
import org.dherhf.order.vo.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 用户端订单接口控制器。
 * <p>
 * 提供锁座下单、支付、取消、退票、订单列表/详情查询、待支付订单查询、
 * 剩余支付时间查询、动态取票码获取等能力，接口路径以 /api/v1/orders 为前缀。
 */
@Tag(name = "订单管理(用户端)", description = "锁座/支付/取消/退票/查询")
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * 锁座下单：用户选择座位后创建待支付订单并锁定座位，15 分钟内需完成支付。
     *
     * @param userId    用户 ID（由请求头 X-User-Id 注入）
     * @param requestId 幂等请求 ID（由请求头 X-Request-Id 注入）
     * @param dto       锁座请求 DTO（含场次、座位、票数）
     * @return 锁座结果（含订单ID与剩余支付时间）
     */
    @Operation(summary = "锁座下单")
    @PostMapping("/lock-seat")
    public Result<LockSeatResultVO> lockSeat(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(hidden = true) @RequestHeader("X-Request-Id") String requestId,
            @RequestBody LockSeatDTO dto) {
        return Result.success(orderService.lockSeat(userId, dto, requestId));
    }

    /**
     * 支付订单：将待支付订单置为已出票，并生成动态取票码。
     *
     * @param userId    用户 ID（由请求头 X-User-Id 注入）
     * @param requestId 幂等请求 ID（由请求头 X-Request-Id 注入）
     * @param id        订单 ID
     * @return 支付结果（含取票码与影院地址）
     */
    @Operation(summary = "支付订单")
    @PostMapping("/{id}/pay")
    public Result<PayResultVO> pay(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(hidden = true) @RequestHeader("X-Request-Id") String requestId,
            @Parameter(description = "订单 ID") @PathVariable Long id) {
        return Result.success(orderService.payOrder(userId, id, requestId));
    }

    /**
     * 取消订单：用户主动取消待支付订单，释放锁定的座位。
     *
     * @param userId    用户 ID（由请求头 X-User-Id 注入）
     * @param requestId 幂等请求 ID（由请求头 X-Request-Id 注入）
     * @param id        订单 ID
     * @return 无返回值
     */
    @Operation(summary = "取消订单")
    @PutMapping("/{id}/cancel")
    public Result<Void> cancel(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(hidden = true) @RequestHeader("X-Request-Id") String requestId,
            @Parameter(description = "订单 ID") @PathVariable Long id) {
        orderService.cancelOrder(userId, id, requestId);
        return Result.success();
    }

    /**
     * 退票：对已出票订单执行退款，释放已售座位（需放映未开始）。
     *
     * @param userId    用户 ID（由请求头 X-User-Id 注入）
     * @param requestId 幂等请求 ID（由请求头 X-Request-Id 注入）
     * @param id        订单 ID
     * @return 无返回值
     */
    @Operation(summary = "退票")
    @PostMapping("/{id}/refund")
    public Result<Void> refund(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(hidden = true) @RequestHeader("X-Request-Id") String requestId,
            @Parameter(description = "订单 ID") @PathVariable Long id) {
        orderService.refundOrder(userId, id, requestId);
        return Result.success();
    }

    /**
     * 用户端订单分页查询，支持按状态/日期/影片名关键词筛选。
     *
     * @param userId   用户 ID（由请求头 X-User-Id 注入）
     * @param status   订单状态（可选）
     * @param dateFrom 开始日期（可选）
     * @param dateTo   结束日期（可选）
     * @param keyword  搜索关键词（可选，匹配影片名）
     * @param page     页码，默认 1
     * @param size     每页条数，默认 20
     * @return 分页的订单列表结果
     */
    @Operation(summary = "订单列表")
    @GetMapping
    public Result<PageResult<OrderListVO>> list(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(description = "订单状态") @RequestParam(required = false) String status,
            @Parameter(description = "开始日期") @RequestParam(required = false) String dateFrom,
            @Parameter(description = "结束日期") @RequestParam(required = false) String dateTo,
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(orderService.listOrders(userId, status, dateFrom, dateTo, keyword, page, size));
    }

    /**
     * 查询当前用户某个订单的详情。
     *
     * @param userId 用户 ID（由请求头 X-User-Id 注入）
     * @param id     订单 ID
     * @return 订单详情视图对象
     */
    @Operation(summary = "订单详情")
    @GetMapping("/{id}")
    public Result<OrderDetailVO> detail(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(description = "订单 ID") @PathVariable Long id) {
        return Result.success(orderService.detail(userId, id));
    }

    /**
     * 查询用户当前待支付订单（若有）。
     *
     * @param userId 用户 ID（由请求头 X-User-Id 注入）
     * @return 待支付订单信息（含剩余支付时间）
     */
    @Operation(summary = "待支付订单")
    @GetMapping("/pending")
    public Result<PendingOrderVO> pending(@Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId) {
        return Result.success(orderService.pendingOrder(userId));
    }

    /**
     * 查询待支付订单剩余支付时间，已过期或非待支付状态返回 expired=true。
     *
     * @param userId 用户 ID（由请求头 X-User-Id 注入）
     * @param id     订单 ID
     * @return 剩余时间视图对象
     */
    @Operation(summary = "订单剩余支付时间")
    @GetMapping("/{id}/remaining-time")
    public Result<RemainingTimeVO> remainingTime(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(description = "订单 ID") @PathVariable Long id) {
        return Result.success(orderService.remainingTime(userId, id));
    }

    /**
     * 获取动态取票码（Redis 中定时刷新，每 60 秒更新）。
     *
     * @param userId 用户 ID（由请求头 X-User-Id 注入）
     * @param id     订单 ID
     * @return 取票码视图对象（含取票码与剩余有效时长）
     */
    @Operation(summary = "获取取票码(动态刷新)")
    @GetMapping("/{id}/pickup-code")
    public Result<PickupCodeVO> pickupCode(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(description = "订单 ID") @PathVariable Long id) {
        return Result.success(orderService.getPickupCode(userId, id));
    }
}
