package org.dherhf.order.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.order.mapper.OrderMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.order.dto.InternalLockSeatDTO;
import org.dherhf.order.dto.LockSeatDTO;
import org.dherhf.movie.entity.Movie;
import org.dherhf.order.entity.Order;
import org.dherhf.order.enums.OrderStatus;
import org.dherhf.order.vo.*;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.schedule.enums.ScheduleSeatStatus;
import org.dherhf.schedule.enums.ScheduleStatus;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.BeanUtils;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final int ORDER_TIMEOUT_SECONDS = 15 * 60;
    private static final long LOCK_WAIT_SECONDS = 3;
    private static final long LOCK_LEASE_SECONDS = 10;

    private final OrderMapper orderMapper;
    private final ScheduleMapper scheduleMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;
    private final MovieMapper movieMapper;
    private final CinemaMapper cinemaMapper;
    private final HallMapper hallMapper;
    private final HallCellMapper hallCellMapper;
    private final IdempotentService idempotentService;
    private final OrderTimeoutService orderTimeoutService;
    private final PickupCodeService pickupCodeService;
    private final RedissonClient redissonClient;
    private final org.dherhf.notification.service.NotificationService notificationService;
    private final org.dherhf.schedule.service.SeatBitmapService seatBitmapService;

    @Override
    @Transactional
    public LockSeatResultVO lockSeat(Long userId, LockSeatDTO dto, String requestId) {
        // Redis 幂等校验
        LockSeatResultVO cached = idempotentService.getIfPresent(userId, requestId, LockSeatResultVO.class);
        if (cached != null) {
            return cached;
        }

        if (!dto.getTicketCount().equals(dto.getSeatIds().size())) {
            throw new BusinessException(400, "购票数量与座位数不一致");
        }

        // 用户级防重锁
        RLock userLock = redissonClient.getLock("lock:user:order:" + userId);
        try {
            if (!userLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                throw new BusinessException(409, "您有正在处理的订单，请稍后重试");
            }

            Schedule schedule = scheduleMapper.selectById(dto.getScheduleId());
            if (schedule == null || !ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
                throw new BusinessException(400, "场次不存在或不可售");
            }

            // 逐座位获取分布式锁
            List<RLock> seatLocks = new ArrayList<>();
            for (Long seatId : dto.getSeatIds()) {
                RLock seatLock = redissonClient.getLock("lock:seat:" + dto.getScheduleId() + ":" + seatId);
                if (!seatLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                    // 释放已获取的锁
                    seatLocks.forEach(RLock::unlock);
                    throw new BusinessException(409, "座位正在被其他用户选择，请稍后重试");
                }
                seatLocks.add(seatLock);
            }

            try {
                LockSeatResultVO result = doLockSeat(userId, dto, schedule);
                idempotentService.put(userId, requestId, result);
                orderTimeoutService.schedule(result.getId());
                notificationService.sendNotification(
                        userId, "LOCK_SUCCESS", "座位已锁定",
                        "座位已锁定，请在15分钟内完成支付。影片：《" + result.getMovieName() + "》，座位：" + result.getSeatInfo(),
                        result.getId());
                return result;
            } finally {
                seatLocks.forEach(l -> {
                    if (l.isHeldByCurrentThread()) l.unlock();
                });
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(500, "锁座操作被中断");
        } finally {
            if (userLock.isHeldByCurrentThread()) userLock.unlock();
        }
    }

    private LockSeatResultVO doLockSeat(Long userId, LockSeatDTO dto, Schedule schedule) {
        // SELECT ... FOR UPDATE 加排他锁,确保并发安全
        List<ScheduleSeat> seats = scheduleSeatMapper.selectForUpdate(
                dto.getScheduleId(), dto.getSeatIds());

        if (seats.size() != dto.getSeatIds().size()) {
            throw new BusinessException(400, "部分座位不存在");
        }

        List<Long> conflictSeatIds = seats.stream()
                .filter(s -> !ScheduleSeatStatus.AVAILABLE.getCode().equals(s.getStatus()))
                .map(ScheduleSeat::getHallCellId)
                .toList();
        if (!conflictSeatIds.isEmpty()) {
            throw new BusinessException(409, "部分座位已被占用");
        }

        Movie movie = movieMapper.selectById(schedule.getMovieId());
        Cinema cinema = cinemaMapper.selectById(schedule.getCinemaId());
        Hall hall = hallMapper.selectById(schedule.getHallId());

        List<HallCell> hallCells = hallCellMapper.selectList(
                new LambdaQueryWrapper<HallCell>()
                        .in(HallCell::getId, dto.getSeatIds())
                        .orderByAsc(HallCell::getRowIndex)
                        .orderByAsc(HallCell::getColIndex));
        String seatInfo = hallCells.stream()
                .map(HallCell::getSeatLabel)
                .collect(Collectors.joining(","));

        LocalDateTime now = LocalDateTime.now();
        Order order = Order.builder()
                .orderNo(generateOrderNo())
                .userId(userId)
                .scheduleId(schedule.getId())
                .movieName(movie != null ? movie.getName() : "")
                .cinemaName(cinema != null ? cinema.getName() : "")
                .hallName(hall != null ? hall.getName() : "")
                .showDate(schedule.getShowDate())
                .startTime(schedule.getStartTime())
                .seatInfo(seatInfo)
                .ticketCount(dto.getTicketCount())
                .totalAmount(schedule.getPrice().multiply(BigDecimal.valueOf(dto.getTicketCount())))
                .status(OrderStatus.PENDING.getCode())
                .createdAt(now)
                .build();
        orderMapper.insert(order);

        for (ScheduleSeat seat : seats) {
            seat.setStatus(ScheduleSeatStatus.LOCKED.getCode());
            seat.setLockedAt(LocalDateTime.now());
            seat.setOrderId(order.getId());
            scheduleSeatMapper.updateById(seat);
        }

        // SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 1
        for (ScheduleSeat seat : seats) {
            seatBitmapService.setOccupied(dto.getScheduleId(), seat.getSeatIndex());
        }

        LockSeatResultVO vo = new LockSeatResultVO();
        BeanUtils.copyProperties(order, vo);
        vo.setExpireAt(order.getCreatedAt().plusSeconds(ORDER_TIMEOUT_SECONDS));
        vo.setRemainingTime(ORDER_TIMEOUT_SECONDS);
        return vo;
    }

    @Override
    @Transactional
    public PayResultVO payOrder(Long userId, Long orderId, String requestId) {
        // Redis 幂等校验
        PayResultVO cached = idempotentService.getIfPresent(userId, requestId, PayResultVO.class);
        if (cached != null) {
            return cached;
        }

        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        if (OrderStatus.CANCELLED.getCode().equals(order.getStatus()) || OrderStatus.REFUNDED.getCode().equals(order.getStatus())) {
            throw new BusinessException(409, "订单已失效，请重新选座");
        }
        if (OrderStatus.PAID.getCode().equals(order.getStatus())) {
            throw new BusinessException(409, "订单已完成支付");
        }

        // 模拟支付：直接更新状态
        order.setStatus(OrderStatus.PAID.getCode());
        order.setPaidAt(LocalDateTime.now());
        orderMapper.updateById(order);

        // 生成动态取票码（Redis, 60秒刷新）
        String pickupCode = pickupCodeService.getOrCreateCode(order.getId());

        // 更新座位状态 locked -> sold
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getOrderId, orderId)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
        for (ScheduleSeat seat : seats) {
            seat.setStatus(ScheduleSeatStatus.SOLD.getCode());
            scheduleSeatMapper.updateById(seat);
        }

        // 取消延迟队列中的超时取消任务
        orderTimeoutService.cancel(orderId);

        // SETBIT schedule:seat:sold:{scheduleId} {seat_index} 1
        for (ScheduleSeat seat : seats) {
            seatBitmapService.setSold(order.getScheduleId(), seat.getSeatIndex());
        }

        Schedule schedule = scheduleMapper.selectById(order.getScheduleId());
        Cinema cinema = cinemaMapper.selectById(schedule != null ? schedule.getCinemaId() : null);

        // 异步发送支付成功通知
        notificationService.sendNotification(
                userId, "PAY_SUCCESS", "支付成功",
                "影院地址：" + (cinema != null ? cinema.getAddress() : "") + "，放映时间：" + order.getShowDate() + " " + order.getStartTime() + "，取票码：" + pickupCode,
                orderId);

        PayResultVO vo = PayResultVO.builder()
                .id(order.getId())
                .orderNo(order.getOrderNo())
                .status(order.getStatus())
                .pickupCode(pickupCode)
                .movieName(order.getMovieName())
                .cinemaName(order.getCinemaName())
                .cinemaAddress(cinema != null ? cinema.getAddress() : null)
                .hallName(order.getHallName())
                .showDate(order.getShowDate())
                .startTime(order.getStartTime())
                .seatInfo(order.getSeatInfo())
                .totalAmount(order.getTotalAmount())
                .build();

        idempotentService.put(userId, requestId, vo);
        return vo;
    }

    @Override
    @Transactional
    public void cancelOrder(Long userId, Long orderId, String requestId) {
        // Redis 幂等校验
        String cached = idempotentService.getIfPresent(userId, requestId, String.class);
        if (cached != null) {
            return;
        }

        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        if (!OrderStatus.PENDING.getCode().equals(order.getStatus())) {
            throw new BusinessException(409, "仅待支付订单可取消");
        }

        // 释放座位
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getOrderId, orderId)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
        for (ScheduleSeat seat : seats) {
            seat.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
            seat.setLockedAt(null);
            seat.setOrderId(null);
            scheduleSeatMapper.updateById(seat);
        }

        order.setStatus(OrderStatus.CANCELLED.getCode());
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason("用户主动取消");
        orderMapper.updateById(order);

        // 取消延迟队列中的超时取消任务
        orderTimeoutService.cancel(orderId);

        // 清理取票码
        pickupCodeService.removeCode(orderId);

        // SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 0
        for (ScheduleSeat seat : seats) {
            seatBitmapService.clearOccupiedIfNotSold(order.getScheduleId(), seat.getSeatIndex());
        }

        idempotentService.put(userId, requestId, "ok");
    }

    @Override
    @Transactional
    public void refundOrder(Long userId, Long orderId, String requestId) {
        // Redis 幂等校验
        String cached = idempotentService.getIfPresent(userId, requestId, String.class);
        if (cached != null) {
            return;
        }

        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        if (!OrderStatus.PAID.getCode().equals(order.getStatus())) {
            throw new BusinessException(409, "仅已出票订单可退票");
        }

        // 校验放映时间
        Schedule schedule = scheduleMapper.selectById(order.getScheduleId());
        if (schedule != null) {
            LocalDateTime showDateTime = LocalDateTime.of(schedule.getShowDate(), schedule.getStartTime());
            if (LocalDateTime.now().isAfter(showDateTime)) {
                throw new BusinessException(409, "放映已开始，不可退票");
            }
        }

        // 释放座位 sold -> available
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getOrderId, orderId)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
        for (ScheduleSeat seat : seats) {
            seat.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
            seat.setOrderId(null);
            scheduleSeatMapper.updateById(seat);
        }

        order.setStatus(OrderStatus.REFUNDED.getCode());
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason("用户退票");
        orderMapper.updateById(order);

        // SETBIT schedule:seat:sold:{scheduleId} {seat_index} 0
        // SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 0
        for (ScheduleSeat seat : seats) {
            seatBitmapService.clearSoldAndOccupied(order.getScheduleId(), seat.getSeatIndex());
        }

        // 异步发送退票成功通知
        notificationService.sendNotification(
                userId, "REFUND_SUCCESS", "退票成功",
                "退票成功，订单已取消，座位已释放。影片：《" + order.getMovieName() + "》，退款金额：¥" + order.getTotalAmount(),
                orderId);

        // 清理取票码
        pickupCodeService.removeCode(orderId);

        idempotentService.put(userId, requestId, "ok");
    }

    @Override
    public PageResult<OrderListVO> listOrders(Long userId, String status, String dateFrom, String dateTo, String keyword, Integer page, Integer size) {
        Page<Order> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>()
                .eq(Order::getUserId, userId)
                .eq(status != null && !status.isBlank(), Order::getStatus, status)
                .ge(dateFrom != null && !dateFrom.isBlank(), Order::getCreatedAt, dateFrom != null ? LocalDate.parse(dateFrom).atStartOfDay() : null)
                .le(dateTo != null && !dateTo.isBlank(), Order::getCreatedAt, dateTo != null ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null)
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Order::getMovieName, keyword))
                .orderByDesc(Order::getCreatedAt);

        IPage<Order> result = orderMapper.selectPage(pageParam, wrapper);
        List<OrderListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    public OrderDetailVO detail(Long userId, Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }
        OrderDetailVO vo = new OrderDetailVO();
        BeanUtils.copyProperties(order, vo);
        if (!OrderStatus.PAID.getCode().equals(order.getStatus())) {
            vo.setPickupCode(null);
        } else {
            vo.setPickupCode(pickupCodeService.getOrCreateCode(order.getId()));
        }
        return vo;
    }

    @Override
    public PendingOrderVO pendingOrder(Long userId) {
        Order order = orderMapper.selectOne(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getUserId, userId)
                        .eq(Order::getStatus, OrderStatus.PENDING.getCode())
                        .orderByDesc(Order::getCreatedAt)
                        .last("LIMIT 1"));

        PendingOrderVO vo = PendingOrderVO.builder()
                .pending(false)
                .build();
        if (order == null) {
            return vo;
        }

        int remaining = ORDER_TIMEOUT_SECONDS - (int) java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).getSeconds();
        if (remaining <= 0) {
            // 异步触发超时取消
            new Thread(() -> timeoutCancel(order.getId())).start();
            return vo;
        }

        vo = PendingOrderVO.builder()
                .pending(true)
                .orderId(order.getId())
                .movieName(order.getMovieName())
                .cinemaName(order.getCinemaName())
                .seatInfo(order.getSeatInfo())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .remainingSeconds(remaining)
                .build();
        return vo;
    }

    @Override
    public RemainingTimeVO remainingTime(Long userId, Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        RemainingTimeVO vo;
        if (!OrderStatus.PENDING.getCode().equals(order.getStatus())) {
            vo = RemainingTimeVO.builder()
                    .remainingTime(0)
                    .expired(true)
                    .build();
            return vo;
        }

        int remaining = ORDER_TIMEOUT_SECONDS - (int) java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).getSeconds();
        vo = RemainingTimeVO.builder()
                .remainingTime(Math.max(0, remaining))
                .expireAt(order.getCreatedAt().plusSeconds(ORDER_TIMEOUT_SECONDS))
                .expired(remaining <= 0)
                .build();
        return vo;
    }

    @Override
    public PickupCodeVO getPickupCode(Long userId, Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }
        if (!OrderStatus.PAID.getCode().equals(order.getStatus())) {
            throw new BusinessException(409, "仅已出票订单可获取取票码");
        }
        String code = pickupCodeService.getOrCreateCode(orderId);
        int expiresIn = pickupCodeService.getRemainingTtl(orderId);
        return PickupCodeVO.builder().pickupCode(code).expiresIn(expiresIn).build();
    }

    @Override
    public LockSeatResultVO internalLockSeat(InternalLockSeatDTO dto) {
        LockSeatDTO lockSeatDTO = LockSeatDTO.builder()
                .scheduleId(dto.getScheduleId())
                .seatIds(dto.getSeatIds())
                .ticketCount(dto.getTicketCount())
                .build();
        return lockSeat(dto.getUserId(), lockSeatDTO, dto.getRequestId());
    }

    @Override
    public PayResultVO internalPayOrder(Long userId, Long orderId, String requestId) {
        return payOrder(userId, orderId, requestId);
    }

    @Override
    public void internalCancelOrder(Long userId, Long orderId, String requestId) {
        cancelOrder(userId, orderId, requestId);
    }

    @Override
    public void internalRefundOrder(Long userId, Long orderId, String requestId) {
        refundOrder(userId, orderId, requestId);
    }

    @Override
    public PageResult<OrderListVO> internalListOrders(Long userId, String keyword, String status, String dateFrom, String dateTo, Integer page, Integer size) {
        Page<Order> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>()
                .eq(Order::getUserId, userId)
                .eq(status != null && !status.isBlank(), Order::getStatus, status)
                .ge(dateFrom != null && !dateFrom.isBlank(), Order::getCreatedAt, dateFrom != null ? LocalDate.parse(dateFrom).atStartOfDay() : null)
                .le(dateTo != null && !dateTo.isBlank(), Order::getCreatedAt, dateTo != null ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null)
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Order::getMovieName, keyword)
                        .or().like(Order::getCinemaName, keyword)
                        .or().like(Order::getOrderNo, keyword))
                .orderByDesc(Order::getCreatedAt);

        IPage<Order> result = orderMapper.selectPage(pageParam, wrapper);
        List<OrderListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    @Transactional
    public void timeoutCancel(Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(404, "订单不存在");
        }
        // 幂等：已支付或已取消则跳过
        if (!OrderStatus.PENDING.getCode().equals(order.getStatus())) {
            log.info("Order {} already {}, skipping timeout cancel", orderId, order.getStatus());
            throw new BusinessException(409, "订单状态非待支付，无法超时取消");
        }

        // 释放座位
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getOrderId, orderId)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
        for (ScheduleSeat seat : seats) {
            seat.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
            seat.setLockedAt(null);
            seat.setOrderId(null);
            scheduleSeatMapper.updateById(seat);
        }

        order.setStatus(OrderStatus.CANCELLED.getCode());
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason("超时取消");
        orderMapper.updateById(order);

        // SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 0
        for (ScheduleSeat seat : seats) {
            seatBitmapService.clearOccupiedIfNotSold(order.getScheduleId(), seat.getSeatIndex());
        }
        notificationService.sendNotification(
                order.getUserId(), "TIMEOUT_CANCEL", "订单超时取消",
                "您的订单已超时取消，座位已释放，如需购票请重新选座。影片：《" + order.getMovieName() + "》",
                orderId);

        log.info("Order {} timeout cancelled", orderId);
    }

    @Override
    @Transactional
    public void cancelTimeoutOrders(LocalDateTime deadline) {
        List<Order> timeoutOrders = orderMapper.selectList(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, OrderStatus.PENDING.getCode())
                        .lt(Order::getCreatedAt, deadline));
        for (Order order : timeoutOrders) {
            try {
                timeoutCancel(order.getId());
            } catch (Exception e) {
                log.error("Error cancelling timeout order {}", order.getId(), e);
            }
        }
        if (!timeoutOrders.isEmpty()) {
            log.info("Scanned and cancelled {} timeout orders", timeoutOrders.size());
        }
    }

    @Scheduled(fixedRate = 60000)
    public void scanTimeoutOrders() {
        LocalDateTime deadline = LocalDateTime.now().minusSeconds(ORDER_TIMEOUT_SECONDS);
        cancelTimeoutOrders(deadline);
    }

    private String generateOrderNo() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%06d", (int) (Math.random() * 1000000));
    }

    private OrderListVO toListVO(Order order) {
        OrderListVO vo = new OrderListVO();
        BeanUtils.copyProperties(order, vo);
        return vo;
    }
}
