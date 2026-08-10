package org.dherhf.order.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.order.dto.InternalLockSeatDTO;
import org.dherhf.order.dto.LockSeatDTO;
import org.dherhf.order.vo.*;
import org.dherhf.schedule.entity.Schedule;

/**
 * 订单服务接口。
 * <p>
 * 定义用户端与内部（Agent）端订单操作的核心契约：
 * 锁座下单、支付、取消、退票、查询、超时取消等。
 */
public interface OrderService {

    /**
     * 锁座下单（用户端入口），含幂等校验、用户级防重锁、逐座位分布式锁。
     *
     * @param userId    用户 ID
     * @param dto       锁座请求 DTO（含场次、座位、票数）
     * @param requestId 幂等请求 ID
     * @return 锁座结果（含订单ID与剩余支付时间）
     */
    LockSeatResultVO lockSeat(Long userId, LockSeatDTO dto, String requestId);

    /**
     * 锁座核心事务（内部方法），执行 SELECT FOR UPDATE 加排他锁、创建订单、更新座位状态。
     *
     * @param userId   用户 ID
     * @param dto      锁座请求 DTO
     * @param schedule 场次实体（已校验）
     * @return 锁座结果
     */
    LockSeatResultVO doLockSeat(Long userId, LockSeatDTO dto, Schedule schedule);

    /**
     * 支付订单，CAS 条件更新为已出票，生成取票码，更新座位为已售。
     *
     * @param userId    用户 ID
     * @param orderId   订单 ID
     * @param requestId 幂等请求 ID
     * @return 支付结果（含取票码）
     */
    PayResultVO payOrder(Long userId, Long orderId, String requestId);

    /**
     * 取消订单（用户主动取消），仅待支付订单可取消，释放锁定座位。
     *
     * @param userId    用户 ID
     * @param orderId   订单 ID
     * @param requestId 幂等请求 ID
     */
    void cancelOrder(Long userId, Long orderId, String requestId);

    /**
     * 退票（已出票订单退款），校验放映未开始后释放已售座位。
     *
     * @param userId    用户 ID
     * @param orderId   订单 ID
     * @param requestId 幂等请求 ID
     */
    void refundOrder(Long userId, Long orderId, String requestId);

    /**
     * 用户端订单分页查询，支持按状态/日期/影片名关键词筛选。
     *
     * @param userId   用户 ID
     * @param status   订单状态（可选）
     * @param dateFrom 开始日期（可选）
     * @param dateTo   结束日期（可选）
     * @param keyword  搜索关键词（可选）
     * @param page     页码
     * @param size     每页条数
     * @return 分页的订单列表结果
     */
    PageResult<OrderListVO> listOrders(Long userId, String status, String dateFrom, String dateTo, String keyword, Integer page, Integer size);

    /**
     * 查询订单详情，仅已出票订单返回动态取票码。
     *
     * @param userId  用户 ID
     * @param orderId 订单 ID
     * @return 订单详情视图对象
     */
    OrderDetailVO detail(Long userId, Long orderId);

    /**
     * 查询用户当前待支付订单，若已超时则同步执行超时取消。
     *
     * @param userId 用户 ID
     * @return 待支付订单信息（含剩余支付时间）
     */
    PendingOrderVO pendingOrder(Long userId);

    /**
     * 查询待支付订单剩余支付时间，已过期返回 expired=true。
     *
     * @param userId  用户 ID
     * @param orderId 订单 ID
     * @return 剩余时间视图对象
     */
    RemainingTimeVO remainingTime(Long userId, Long orderId);

    /**
     * 获取动态取票码（Redis 中定时刷新），仅已出票订单可获取。
     *
     * @param userId  用户 ID
     * @param orderId 订单 ID
     * @return 取票码视图对象
     */
    PickupCodeVO getPickupCode(Long userId, Long orderId);

    /**
     * Agent 服务内部锁座入口，通过 self 代理调用 {@link #lockSeat}。
     *
     * @param dto 内部锁座请求 DTO
     * @return 锁座结果
     */
    LockSeatResultVO internalLockSeat(InternalLockSeatDTO dto);

    /**
     * Agent 服务内部支付入口，通过 self 代理确保事务生效。
     *
     * @param userId    用户 ID
     * @param orderId   订单 ID
     * @param requestId 幂等请求 ID
     * @return 支付结果
     */
    PayResultVO internalPayOrder(Long userId, Long orderId, String requestId);

    /**
     * Agent 服务内部取消入口，通过 self 代理确保事务生效。
     *
     * @param userId    用户 ID
     * @param orderId   订单 ID
     * @param requestId 幂等请求 ID
     */
    void internalCancelOrder(Long userId, Long orderId, String requestId);

    /**
     * Agent 服务内部退票入口，通过 self 代理确保事务生效。
     *
     * @param userId    用户 ID
     * @param orderId   订单 ID
     * @param requestId 幂等请求 ID
     */
    void internalRefundOrder(Long userId, Long orderId, String requestId);

    /**
     * Agent 服务内部订单分页查询，支持按影片名/影院名/订单号模糊搜索。
     *
     * @param userId   用户 ID
     * @param keyword  搜索关键词（可选）
     * @param status   订单状态（可选）
     * @param dateFrom 开始日期（可选）
     * @param dateTo   结束日期（可选）
     * @param page     页码
     * @param size     每页条数
     * @return 分页的订单列表结果
     */
    PageResult<OrderListVO> internalListOrders(Long userId, String keyword, String status, String dateFrom, String dateTo, Integer page, Integer size);

    /**
     * 超时取消单个订单（Redis 延迟队列触发或定时扫描触发）。
     * CAS 幂等保证重复触发安全。
     *
     * @param orderId 订单 ID
     */
    void timeoutCancel(Long orderId);

}
