package org.dherhf.order.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.order.dto.InternalLockSeatDTO;
import org.dherhf.order.dto.LockSeatDTO;
import org.dherhf.order.vo.*;

import java.time.LocalDateTime;

public interface OrderService {

    LockSeatResultVO lockSeat(Long userId, LockSeatDTO dto, String requestId);

    PayResultVO payOrder(Long userId, Long orderId, String requestId);

    void cancelOrder(Long userId, Long orderId, String requestId);

    void refundOrder(Long userId, Long orderId, String requestId);

    PageResult<OrderListVO> listOrders(Long userId, String status, String dateFrom, String dateTo, String keyword, Integer page, Integer size);

    OrderDetailVO detail(Long userId, Long orderId);

    PendingOrderVO pendingOrder(Long userId);

    RemainingTimeVO remainingTime(Long userId, Long orderId);

    PickupCodeVO getPickupCode(Long userId, Long orderId);

    LockSeatResultVO internalLockSeat(InternalLockSeatDTO dto);

    PayResultVO internalPayOrder(Long userId, Long orderId, String requestId);

    void internalCancelOrder(Long userId, Long orderId, String requestId);

    void internalRefundOrder(Long userId, Long orderId, String requestId);

    PageResult<OrderListVO> internalListOrders(Long userId, String keyword, String status, String dateFrom, String dateTo, Integer page, Integer size);

    void timeoutCancel(Long orderId);

    void cancelTimeoutOrders(LocalDateTime deadline);

    /**
     * 处理支付回调（AI知托付→妙语）。
     *
     * @param paymentNo       支付单号
     * @param merchantOrderNo 妙语订单号
     * @param businessNo      转账流水号
     * @param status          支付状态 SUCCESS / FAILED / EXPIRED
     * @param amount          回调金额
     * @return "SUCCESS" 处理成功, "FAIL" 处理失败
     */
    String handlePaymentCallback(String paymentNo, String merchantOrderNo, String businessNo, String status, String amount);
}
