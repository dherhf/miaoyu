package org.dherhf.order.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.order.dto.CheckTicketDTO;
import org.dherhf.order.service.AdminOrderService;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.dherhf.order.vo.AdminOrderListVO;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Tag(name = "订单明细(管理端)", description = "管理端订单列表/详情")
@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    @Operation(summary = "订单列表(管理端)")
    @GetMapping
    public Result<PageResult<AdminOrderListVO>> list(
            @RequestParam(required = false) String orderNo,
            @RequestParam(required = false) String movieName,
            @RequestParam(required = false) String cinemaName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(adminOrderService.list(orderNo, movieName, cinemaName, status, dateFrom, dateTo, page, size));
    }

    @Operation(summary = "订单详情(管理端)")
    @GetMapping("/{id}")
    public Result<AdminOrderDetailVO> detail(@PathVariable Long id) {
        return Result.success(adminOrderService.detail(id));
    }

    @Operation(summary = "检票(管理端)")
    @PostMapping("/check-ticket")
    public Result<AdminOrderDetailVO> checkTicket(@Validated @RequestBody CheckTicketDTO dto) {
        return Result.success(adminOrderService.checkTicket(dto.getPickupCode()));
    }
}
