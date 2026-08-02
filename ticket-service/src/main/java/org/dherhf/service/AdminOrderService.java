package org.dherhf.service;

import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.vo.AdminOrderDetailVO;
import org.dherhf.vo.AdminOrderListVO;

public interface AdminOrderService {

    Result<PageResult<AdminOrderListVO>> list(String orderNo, String movieName, String cinemaName, String status, String dateFrom, String dateTo, Integer page, Integer size);

    Result<AdminOrderDetailVO> detail(Long id);
}
