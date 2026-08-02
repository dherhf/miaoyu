package org.dherhf.service;

import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.InternalLockSeatDTO;
import org.dherhf.dto.LockSeatDTO;
import org.dherhf.vo.*;

import java.time.LocalDateTime;

public interface OrderService {

    Result<LockSeatResultVO> lockSeat(Long userId, LockSeatDTO dto, String requestId);

    Result<PayResultVO> payOrder(Long userId, Long orderId, String requestId);

    Result<Void> cancelOrder(Long userId, Long orderId, String requestId);

    Result<Void> refundOrder(Long userId, Long orderId, String requestId);

    Result<PageResult<OrderListVO>> listOrders(Long userId, String status, String dateFrom, String dateTo, String keyword, Integer page, Integer size);

    Result<OrderDetailVO> detail(Long userId, Long orderId);

    Result<PendingOrderVO> pendingOrder(Long userId);

    Result<RemainingTimeVO> remainingTime(Long userId, Long orderId);

    Result<LockSeatResultVO> internalLockSeat(InternalLockSeatDTO dto);

    Result<PayResultVO> internalPayOrder(Long userId, Long orderId, String requestId);

    Result<PageResult<OrderListVO>> internalListOrders(Long userId, String keyword, String status, String dateFrom, String dateTo, Integer page, Integer size);

    void timeoutCancel(Long orderId);

    void cancelTimeoutOrders(LocalDateTime deadline);
}
