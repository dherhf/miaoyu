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
import org.dherhf.order.vo.*;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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
    private final RedissonClient redissonClient;

    @Override
    @Transactional
    public LockSeatResultVO lockSeat(Long userId, LockSeatDTO dto, String requestId) {
        // Redis 幂等校验
        Object cached = idempotentService.getIfPresent(requestId);
        if (cached != null) {
            return (LockSeatResultVO) cached;
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
            if (schedule == null || !"onsale".equals(schedule.getStatus())) {
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
                idempotentService.put(requestId, result);
                orderTimeoutService.schedule(result.getId());
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
                .filter(s -> !"available".equals(s.getStatus()))
                .map(ScheduleSeat::getHallCellId)
                .collect(Collectors.toList());
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

        Order order = new Order();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setScheduleId(schedule.getId());
        order.setMovieName(movie != null ? movie.getName() : "");
        order.setCinemaName(cinema != null ? cinema.getName() : "");
        order.setHallName(hall != null ? hall.getName() : "");
        order.setShowDate(schedule.getShowDate());
        order.setStartTime(schedule.getStartTime());
        order.setSeatInfo(seatInfo);
        order.setTicketCount(dto.getTicketCount());
        order.setTotalAmount(schedule.getPrice().multiply(BigDecimal.valueOf(dto.getTicketCount())));
        order.setStatus("pending");
        orderMapper.insert(order);

        for (ScheduleSeat seat : seats) {
            seat.setStatus("locked");
            seat.setLockedAt(LocalDateTime.now());
            seat.setOrderId(order.getId());
            scheduleSeatMapper.updateById(seat);
        }

        // TODO: SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 1

        LockSeatResultVO vo = new LockSeatResultVO();
        BeanUtils.copyProperties(order, vo);
        return vo;
    }

    @Override
    @Transactional
    public PayResultVO payOrder(Long userId, Long orderId, String requestId) {
        // Redis 幂等校验
        Object cached = idempotentService.getIfPresent(requestId);
        if (cached != null) {
            return (PayResultVO) cached;
        }

        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        if ("cancelled".equals(order.getStatus()) || "refunded".equals(order.getStatus())) {
            throw new BusinessException(409, "订单已失效，请重新选座");
        }
        if ("paid".equals(order.getStatus())) {
            throw new BusinessException(409, "订单已完成支付");
        }

        // 模拟支付：直接更新状态
        order.setStatus("paid");
        order.setPaidAt(LocalDateTime.now());
        order.setPickupCode(UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase());
        orderMapper.updateById(order);

        // 更新座位状态 locked -> sold
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getOrderId, orderId)
                        .eq(ScheduleSeat::getStatus, "locked"));
        for (ScheduleSeat seat : seats) {
            seat.setStatus("sold");
            scheduleSeatMapper.updateById(seat);
        }

        // 取消延迟队列中的超时取消任务
        orderTimeoutService.cancel(orderId);

        // TODO: SETBIT schedule:seat:sold:{scheduleId} {seat_index} 1
        // TODO: 异步发送支付成功通知

        Schedule schedule = scheduleMapper.selectById(order.getScheduleId());
        Cinema cinema = cinemaMapper.selectById(schedule != null ? schedule.getCinemaId() : null);

        PayResultVO vo = new PayResultVO();
        vo.setId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setStatus(order.getStatus());
        vo.setPickupCode(order.getPickupCode());
        vo.setMovieName(order.getMovieName());
        vo.setCinemaName(order.getCinemaName());
        vo.setCinemaAddress(cinema != null ? cinema.getAddress() : null);
        vo.setHallName(order.getHallName());
        vo.setShowDate(order.getShowDate());
        vo.setStartTime(order.getStartTime());
        vo.setSeatInfo(order.getSeatInfo());
        vo.setTotalAmount(order.getTotalAmount());

        idempotentService.put(requestId, vo);
        return vo;
    }

    @Override
    @Transactional
    public void cancelOrder(Long userId, Long orderId, String requestId) {
        // Redis 幂等校验
        Object cached = idempotentService.getIfPresent(requestId);
        if (cached != null) {
            return;
        }

        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        if (!"pending".equals(order.getStatus())) {
            throw new BusinessException(409, "仅待支付订单可取消");
        }

        // 释放座位
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getOrderId, orderId)
                        .eq(ScheduleSeat::getStatus, "locked"));
        for (ScheduleSeat seat : seats) {
            seat.setStatus("available");
            seat.setLockedAt(null);
            seat.setOrderId(null);
            scheduleSeatMapper.updateById(seat);
        }

        order.setStatus("cancelled");
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason("用户主动取消");
        orderMapper.updateById(order);

        // 取消延迟队列中的超时取消任务
        orderTimeoutService.cancel(orderId);

        // TODO: SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 0

        idempotentService.put(requestId, "ok");
    }

    @Override
    @Transactional
    public void refundOrder(Long userId, Long orderId, String requestId) {
        // Redis 幂等校验
        Object cached = idempotentService.getIfPresent(requestId);
        if (cached != null) {
            return;
        }

        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        if (!"paid".equals(order.getStatus())) {
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
                        .eq(ScheduleSeat::getStatus, "sold"));
        for (ScheduleSeat seat : seats) {
            seat.setStatus("available");
            seat.setOrderId(null);
            scheduleSeatMapper.updateById(seat);
        }

        order.setStatus("refunded");
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason("用户退票");
        orderMapper.updateById(order);

        // TODO: SETBIT schedule:seat:sold:{scheduleId} {seat_index} 0
        // TODO: SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 0
        // TODO: 异步发送退票成功通知

        idempotentService.put(requestId, "ok");
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
        if (!"paid".equals(order.getStatus())) {
            vo.setPickupCode(null);
        }
        return vo;
    }

    @Override
    public PendingOrderVO pendingOrder(Long userId) {
        Order order = orderMapper.selectOne(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getUserId, userId)
                        .eq(Order::getStatus, "pending")
                        .orderByDesc(Order::getCreatedAt)
                        .last("LIMIT 1"));

        PendingOrderVO vo = new PendingOrderVO();
        if (order == null) {
            vo.setPending(false);
            return vo;
        }

        int remaining = ORDER_TIMEOUT_SECONDS - (int) java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).getSeconds();
        if (remaining <= 0) {
            vo.setPending(false);
            // 异步触发超时取消
            new Thread(() -> timeoutCancel(order.getId())).start();
            return vo;
        }

        vo.setPending(true);
        vo.setOrderId(order.getId());
        vo.setMovieName(order.getMovieName());
        vo.setCinemaName(order.getCinemaName());
        vo.setSeatInfo(order.getSeatInfo());
        vo.setTotalAmount(order.getTotalAmount());
        vo.setStatus(order.getStatus());
        vo.setRemainingSeconds(remaining);
        return vo;
    }

    @Override
    public RemainingTimeVO remainingTime(Long userId, Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(404, "订单不存在");
        }

        RemainingTimeVO vo = new RemainingTimeVO();
        if (!"pending".equals(order.getStatus())) {
            vo.setRemainingTime(0);
            vo.setExpired(true);
            return vo;
        }

        int remaining = ORDER_TIMEOUT_SECONDS - (int) java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).getSeconds();
        vo.setRemainingTime(Math.max(0, remaining));
        vo.setExpireAt(order.getCreatedAt().plusSeconds(ORDER_TIMEOUT_SECONDS));
        vo.setExpired(remaining <= 0);
        return vo;
    }

    @Override
    public LockSeatResultVO internalLockSeat(InternalLockSeatDTO dto) {
        LockSeatDTO lockSeatDTO = new LockSeatDTO();
        lockSeatDTO.setScheduleId(dto.getScheduleId());
        lockSeatDTO.setSeatIds(dto.getSeatIds());
        lockSeatDTO.setTicketCount(dto.getTicketCount());
        return lockSeat(dto.getUserId(), lockSeatDTO, dto.getRequestId());
    }

    @Override
    public PayResultVO internalPayOrder(Long userId, Long orderId, String requestId) {
        return payOrder(userId, orderId, requestId);
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
            return;
        }
        // 幂等：已支付或已取消则跳过
        if (!"pending".equals(order.getStatus())) {
            log.info("Order {} already {}, skipping timeout cancel", orderId, order.getStatus());
            return;
        }

        // 释放座位
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getOrderId, orderId)
                        .eq(ScheduleSeat::getStatus, "locked"));
        for (ScheduleSeat seat : seats) {
            seat.setStatus("available");
            seat.setLockedAt(null);
            seat.setOrderId(null);
            scheduleSeatMapper.updateById(seat);
        }

        order.setStatus("cancelled");
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason("超时取消");
        orderMapper.updateById(order);

        // TODO: SETBIT schedule:seat:occupied:{scheduleId} {seat_index} 0
        // TODO: 异步发送超时取消通知

        log.info("Order {} timeout cancelled", orderId);
    }

    @Override
    @Transactional
    public void cancelTimeoutOrders(LocalDateTime deadline) {
        List<Order> timeoutOrders = orderMapper.selectList(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, "pending")
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
