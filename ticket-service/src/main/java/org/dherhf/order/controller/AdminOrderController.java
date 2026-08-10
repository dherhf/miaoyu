package org.dherhf.order.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.order.dto.CheckTicketDTO;
import org.dherhf.order.service.AdminOrderService;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.dherhf.order.vo.AdminOrderListVO;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 订单管理端接口控制器。
 * <p>
 * 面向运营/管理员提供订单分页查询、订单详情查看与核销检票功能，
 * 所有接口路径以 /api/v1/admin/orders 为前缀。
 */
@Tag(name = "订单明细(管理端)", description = "管理端订单列表/详情")
@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    /**
     * 分页查询管理端订单列表，支持按订单号/影片名/影院名/状态/日期区间筛选。
     *
     * @param orderNo   订单号（可选）
     * @param movieName 影片名称（可选，模糊匹配）
     * @param cinemaName 影院名称（可选，模糊匹配）
     * @param status    订单状态（可选）
     * @param dateFrom  开始日期（可选）
     * @param dateTo    结束日期（可选）
     * @param page      页码，默认 1
     * @param size      每页条数，默认 20
     * @return 分页的订单列表结果
     */
    @Operation(summary = "订单列表(管理端)")
    @GetMapping
    public Result<PageResult<AdminOrderListVO>> list(
            @Parameter(description = "订单号") @RequestParam(required = false) String orderNo,
            @Parameter(description = "影片名称") @RequestParam(required = false) String movieName,
            @Parameter(description = "影院名称") @RequestParam(required = false) String cinemaName,
            @Parameter(description = "订单状态") @RequestParam(required = false) String status,
            @Parameter(description = "开始日期") @RequestParam(required = false) String dateFrom,
            @Parameter(description = "结束日期") @RequestParam(required = false) String dateTo,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(adminOrderService.list(orderNo, movieName, cinemaName, status, dateFrom, dateTo, page, size));
    }

    /**
     * 查询订单详情（管理端），包含座位分布、脱敏手机号等。
     *
     * @param id 订单 ID
     * @return 订单详情视图对象
     */
    @Operation(summary = "订单详情(管理端)")
    @GetMapping("/{id}")
    public Result<AdminOrderDetailVO> detail(@Parameter(description = "订单 ID") @PathVariable Long id) {
        return Result.success(adminOrderService.detail(id));
    }

    /**
     * 通过取票码执行核销检票操作。
     *
     * @param dto 取票码校验请求 DTO，包含取票码
     * @return 检票成功后的订单详情
     */
    @Operation(summary = "检票(管理端)")
    @PostMapping("/check-ticket")
    public Result<AdminOrderDetailVO> checkTicket(@Validated @RequestBody CheckTicketDTO dto) {
        return Result.success(adminOrderService.checkTicket(dto.getPickupCode()));
    }
}
