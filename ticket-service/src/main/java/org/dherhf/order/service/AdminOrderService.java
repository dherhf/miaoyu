package org.dherhf.order.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.dherhf.order.vo.AdminOrderListVO;

public interface AdminOrderService {

    Result<PageResult<AdminOrderListVO>> list(String orderNo, String movieName, String cinemaName, String status, String dateFrom, String dateTo, Integer page, Integer size);

    Result<AdminOrderDetailVO> detail(Long id);
}
