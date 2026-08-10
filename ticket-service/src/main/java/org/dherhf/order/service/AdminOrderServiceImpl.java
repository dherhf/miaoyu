package org.dherhf.order.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.dherhf.order.vo.AdminOrderListVO;
import org.dherhf.cinema.vo.AdminSeatVO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.order.entity.Order;
import org.dherhf.order.enums.OrderStatus;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.auth.entity.User;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.order.mapper.OrderMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.auth.mapper.UserMapper;
import org.dherhf.common.util.CryptoUtil;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 订单管理端服务实现。
 * <p>
 * 实现管理端订单分页查询、详情查看与核销检票。
 * 检票操作使用 Redisson 订单级锁 + CAS 条件更新保证并发安全。
 */
@Service
@RequiredArgsConstructor
public class AdminOrderServiceImpl implements AdminOrderService {

    private final OrderMapper orderMapper;
    private final UserMapper userMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;
    private final HallCellMapper hallCellMapper;
    private final PickupCodeService pickupCodeService;
    private final RedissonClient redissonClient;

    private static final long LOCK_WAIT_SECONDS = 3;
    private static final long LOCK_LEASE_SECONDS = 10;

    /**
     * {@inheritDoc}
     * <p>
     * 按订单号/影片名/影院名/状态/日期区间组合条件分页查询，结果按创建时间倒序。
     */
    @Override
    public PageResult<AdminOrderListVO> list(String orderNo, String movieName, String cinemaName, String status, String dateFrom, String dateTo, Integer page, Integer size) {
        Page<Order> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>()
                .eq(orderNo != null && !orderNo.isBlank(), Order::getOrderNo, orderNo)
                .like(movieName != null && !movieName.isBlank(), Order::getMovieName, movieName)
                .like(cinemaName != null && !cinemaName.isBlank(), Order::getCinemaName, cinemaName)
                .eq(status != null && !status.isBlank(), Order::getStatus, status)
                .ge(dateFrom != null && !dateFrom.isBlank(), Order::getCreatedAt, parseDateTime(dateFrom))
                .le(dateTo != null && !dateTo.isBlank(), Order::getCreatedAt, parseDateTime(dateTo))
                .orderByDesc(Order::getCreatedAt);

        IPage<Order> result = orderMapper.selectPage(pageParam, wrapper);
        List<AdminOrderListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    /**
     * {@inheritDoc}
     * <p>
     * 查询订单基础信息后补充用户脱敏手机号与座位分布详情。
     */
    @Override
    public AdminOrderDetailVO detail(Long id) {
        Order order = orderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException(404, "订单不存在");
        }

        AdminOrderDetailVO vo = new AdminOrderDetailVO();
        BeanUtils.copyProperties(order, vo);

        // 查询用户手机号并脱敏
        vo.setUserPhone(getMaskedPhone(order.getUserId()));

        // 查询座位详情
        List<ScheduleSeat> scheduleSeats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>().eq(ScheduleSeat::getOrderId, id));
        List<AdminSeatVO> seats = new ArrayList<>();
        for (ScheduleSeat ss : scheduleSeats) {
            if (ss.getHallCellId() != null) {
                HallCell cell = hallCellMapper.selectById(ss.getHallCellId());
                if (cell != null) {
                    AdminSeatVO seatVO = AdminSeatVO.builder()
                            .seatLabel(cell.getSeatLabel())
                            .status(ss.getStatus())
                            .build();
                    seats.add(seatVO);
                }
            }
        }
        vo.setSeats(seats);
        return vo;
    }

    /**
     * {@inheritDoc}
     * <p>
     * 核销流程：校验取票码有效性 → 获取订单级分布式锁 → 校验状态（须为已出票）→
     * CAS 条件更新为已检票 → 清理取票码缓存 → 返回订单详情。
     */
    @Override
    @Transactional
    public AdminOrderDetailVO checkTicket(String pickupCode) {
        Long orderId = pickupCodeService.verifyCode(pickupCode);
        if (orderId == null) {
            throw new BusinessException(404, "取票码无效或已过期");
        }

        RLock orderLock = redissonClient.getLock("lock:order:" + orderId);
        try {
            if (!orderLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                throw new BusinessException(409, "订单正在处理中，请稍后重试");
            }

            Order order = orderMapper.selectById(orderId);
            if (order == null) {
                throw new BusinessException(404, "订单不存在");
            }
            if (OrderStatus.EXPIRED.getCode().equals(order.getStatus())) {
                throw new BusinessException(409, "场次已结束，无法检票");
            }
            if (OrderStatus.CHECKED.getCode().equals(order.getStatus())) {
                throw new BusinessException(409, "该订单已检票");
            }
            if (!OrderStatus.PAID.getCode().equals(order.getStatus())) {
                throw new BusinessException(409, "该订单状态不支持检票");
            }

            // 条件 UPDATE (CAS)：仅当 status=PAID 时更新为 CHECKED
            int affected = orderMapper.updateToCheckedIfPaid(orderId, LocalDateTime.now());
            if (affected == 0) {
                throw new BusinessException(409, "订单状态已变更，请刷新后重试");
            }

            pickupCodeService.removeCode(orderId);
            return detail(orderId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(500, "检票操作被中断");
        } finally {
            if (orderLock.isHeldByCurrentThread()) orderLock.unlock();
        }
    }

    /**
     * 将订单实体转换为管理端列表视图对象，并补充脱敏手机号。
     *
     * @param order 订单实体
     * @return 管理端订单列表 VO
     */
    private AdminOrderListVO toListVO(Order order) {
        AdminOrderListVO vo = new AdminOrderListVO();
        BeanUtils.copyProperties(order, vo);
        vo.setUserPhone(getMaskedPhone(order.getUserId()));
        return vo;
    }

    /**
     * 查询用户手机号并脱敏（中间四位替换为 ****），解密失败则返回原始值。
     *
     * @param userId 用户 ID
     * @return 脱敏后的手机号字符串，用户不存在时返回 null
     */
    private String getMaskedPhone(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getPhone() == null) {
            return null;
        }
        String phone;
        try {
            phone = CryptoUtil.decrypt(user.getPhone());
        } catch (Exception e) {
            phone = user.getPhone();
        }
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /**
     * 将日期字符串（yyyy-MM-dd）解析为当天 00:00:00 的 LocalDateTime。
     *
     * @param dateStr 日期字符串
     * @return 对应 LocalDateTime，空或空白时返回 null
     */
    /**
     * 将日期字符串（yyyy-MM-dd）解析为 LocalDateTime（当天 00:00:00）。
     *
     * @param dateStr 日期字符串
     * @return 解析后的 LocalDateTime，输入为空时返回 null
     */
    private LocalDateTime parseDateTime(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;
        }
        return LocalDateTime.parse(dateStr + " 00:00:00", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
