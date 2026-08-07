package org.dherhf.order.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.dherhf.order.vo.AdminOrderListVO;

public interface AdminOrderService {

    PageResult<AdminOrderListVO> list(String orderNo, String movieName, String cinemaName, String status, String dateFrom, String dateTo, Integer page, Integer size);

    AdminOrderDetailVO detail(Long id);

    AdminOrderDetailVO checkTicket(String pickupCode);
}
