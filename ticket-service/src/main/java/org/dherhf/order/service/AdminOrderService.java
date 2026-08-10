package org.dherhf.order.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.dherhf.order.vo.AdminOrderListVO;

/**
 * 订单管理端服务接口。
 * <p>
 * 提供管理端的订单分页查询、详情查看与核销检票能力。
 */
public interface AdminOrderService {

    /**
     * 分页查询管理端订单列表，支持多条件筛选。
     *
     * @param orderNo    订单号（可选）
     * @param movieName  影片名称（可选，模糊匹配）
     * @param cinemaName 影院名称（可选，模糊匹配）
     * @param status     订单状态（可选）
     * @param dateFrom   开始日期（可选）
     * @param dateTo     结束日期（可选）
     * @param page       页码
     * @param size       每页条数
     * @return 分页的订单列表结果
     */
    PageResult<AdminOrderListVO> list(String orderNo, String movieName, String cinemaName, String status, String dateFrom, String dateTo, Integer page, Integer size);

    /**
     * 查询订单详情（管理端），含座位分布与脱敏手机号。
     *
     * @param id 订单 ID
     * @return 订单详情视图对象
     */
    AdminOrderDetailVO detail(Long id);

    /**
     * 通过取票码核销检票，将已出票订单更新为已检票。
     *
     * @param pickupCode 取票码
     * @return 检票成功后的订单详情
     */
    AdminOrderDetailVO checkTicket(String pickupCode);
}
