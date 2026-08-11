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
import org.dherhf.common.util.PageUtil;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.notification.service.NotificationService;
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
import org.dherhf.schedule.service.SeatBitmapService;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private final NotificationService notificationService;
    private final SeatBitmapService seatBitmapService;

    @Lazy
    @Autowired
    private OrderService self;

    /**
     * 锁座（无 @Transactional）。
     * <p>
     * 并发控制：Redisson 用户级锁（防重复下单）+ 逐座位分布式锁（防座位竞争）。
     * 事务边界：锁的获取与释放均在事务外，事务收缩到 {@link #doLockSeat}，
     * 避免锁释放先于事务提交导致并发请求读到未提交的 pending 订单。
     * 幂等：通过 requestId 在 Redis 缓存结果，重复请求直接返回。
     */
    @Override
    public LockSeatResultVO lockSeat(Long userId, LockSeatDTO dto, String requestId) {
        // ── 1. 幂等校验：相同 userId+requestId 的重复请求直接返回缓存结果 ──
        LockSeatResultVO cached = idempotentService.getIfPresent(userId, requestId, LockSeatResultVO.class);
        if (cached != null) {
            return cached;
        }

        // ── 2. 参数校验 ──
        if (dto.getSeatIds() == null || dto.getSeatIds().isEmpty() || dto.getTicketCount() == null) {
            throw new BusinessException(400, "座位和票数不能为空");
        }
        if (!dto.getTicketCount().equals(dto.getSeatIds().size())) {
            throw new BusinessException(400, "购票数量与座位数不一致");
        }
        if (dto.getTicketCount() > 6) {
            throw new BusinessException(400, "单次最多购买6张票");
        }

        // ── 3. 用户级防重锁：同一用户同一时间只能有一个锁座流程 ──
        RLock userLock = redissonClient.getLock("lock:user:order:" + userId);
        try {
            if (!userLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                throw new BusinessException(409, "您有正在处理的订单，请稍后重试");
            }

            // ── 4. 待支付订单检查：防止用户同时持有多个待支付订单 ──
            Long existingPendingCount = orderMapper.selectCount(
                    new LambdaQueryWrapper<Order>()
                            .eq(Order::getUserId, userId)
                            .eq(Order::getStatus, OrderStatus.PENDING.getCode()));
            if (existingPendingCount > 0) {
                throw new BusinessException(409, "您已有待支付订单，请先完成支付或取消后再选座");
            }

            // ── 5. 场次状态校验：仅 ON_SALE 状态的场次可锁座 ──
            Schedule schedule = scheduleMapper.selectById(dto.getScheduleId());
            if (schedule == null || !ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
                throw new BusinessException(400, "场次不存在或不可售");
            }

            // ── 6. 逐座位获取分布式锁：按 seatId 顺序获取，防止死锁 ──
            List<RLock> seatLocks = new ArrayList<>();
            for (Long seatId : dto.getSeatIds()) {
                RLock seatLock = redissonClient.getLock("lock:seat:" + dto.getScheduleId() + ":" + seatId);
                if (!seatLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                    // 获取失败：释放已获取的锁，避免残留
                    seatLocks.forEach(RLock::unlock);
                    throw new BusinessException(409, "座位正在被其他用户选择，请稍后重试");
                }
                seatLocks.add(seatLock);
            }

            // ── 7. 执行核心事务（通过 self 代理确保 @Transactional 生效）──
            try {
                LockSeatResultVO result = self.doLockSeat(userId, dto, schedule);

                // ── 8. 后续处理：缓存幂等结果、调度超时取消、发送通知 ──
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

    /**
     * 锁座核心事务（{@code @Transactional}）。
     * <p>
     * 通过 self 代理调用以确保事务生效。SELECT ... FOR UPDATE 对目标座位加行级排他锁，
     * 二次校验座位状态后创建订单并更新座位为 LOCKED，同步 Redis Bitmap。
     * 事务在锁释放前提交，保证并发请求持有分布式锁时可见已提交数据。
     */
    @Override
    @Transactional
    public LockSeatResultVO doLockSeat(Long userId, LockSeatDTO dto, Schedule schedule) {
        // ── 1. SELECT ... FOR UPDATE 对目标座位加行级排他锁（悲观锁，防止并发修改）──
        List<ScheduleSeat> seats = scheduleSeatMapper.selectForUpdate(
                dto.getScheduleId(), dto.getSeatIds());

        if (seats.size() != dto.getSeatIds().size()) {
            throw new BusinessException(400, "部分座位不存在");
        }

        // ── 2. 二次校验座位状态：分布式锁释放后、事务提交前可能有并发请求改了座位状态 ──
        List<Long> conflictSeatIds = seats.stream()
                .filter(s -> !ScheduleSeatStatus.AVAILABLE.getCode().equals(s.getStatus()))
                .map(ScheduleSeat::getHallCellId)
                .toList();
        if (!conflictSeatIds.isEmpty()) {
            throw new BusinessException(409, "部分座位已被占用");
        }

        // ── 3. 构建订单快照信息（影片名/影院名/影厅名/座位标签）──
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

        // ── 4. 创建订单（PENDING 状态），orderNo 冲突重试 3 次 ──
        LocalDateTime now = LocalDateTime.now();
        Order order = Order.builder()
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
        // orderNo 唯一约束冲突时重试（时间戳+随机数高并发下可能碰撞）
        for (int attempt = 0; attempt < 3; attempt++) {
            order.setOrderNo(generateOrderNo());
            try {
                orderMapper.insert(order);
                break;
            } catch (DuplicateKeyException e) {
                if (attempt == 2) {
                    throw new BusinessException(500, "订单号生成失败，请重试");
                }
            }
        }

        // ── 5. 更新座位状态 AVAILABLE → LOCKED，关联订单 ID ──
        for (ScheduleSeat seat : seats) {
            seat.setStatus(ScheduleSeatStatus.LOCKED.getCode());
            seat.setLockedAt(LocalDateTime.now());
            seat.setOrderId(order.getId());
            scheduleSeatMapper.updateById(seat);
        }

        // ── 6. 同步 Redis Bitmap：SETBIT locked {seatIndex} 1（读加速缓存）──
        //     延迟到事务提交后执行，避免回滚后缓存脏数据
        afterCommit(() -> {
            for (ScheduleSeat seat : seats) {
                seatBitmapService.setLocked(dto.getScheduleId(), seat.getSeatIndex());
            }
        });

        LockSeatResultVO vo = new LockSeatResultVO();
        BeanUtils.copyProperties(order, vo);
        vo.setExpireAt(order.getCreatedAt().plusSeconds(ORDER_TIMEOUT_SECONDS));
        vo.setRemainingTime(ORDER_TIMEOUT_SECONDS);
        return vo;
    }

    /**
     * 支付订单。
     * <p>
     * 并发控制：Redisson 订单级分布式锁 + CAS 条件更新（{@code updateToPaidIfPending}）。
     * 即使分布式锁存在极端竞态，数据库 CAS 仍能保证幂等——并发请求的 affected=0 直接失败。
     * 座位状态 LOCKED → SOLD，同步 Redis Bitmap，取消超时取消任务，生成动态取票码。
     */
    @Override
    @Transactional
    public PayResultVO payOrder(Long userId, Long orderId, String requestId) {
        // ── 1. 幂等校验 ──
        PayResultVO cached = idempotentService.getIfPresent(userId, requestId, PayResultVO.class);
        if (cached != null) {
            return cached;
        }

        // ── 2. 订单级分布式锁：与 cancelOrder/refundOrder/checkTicket 互斥 ──
        RLock orderLock = redissonClient.getLock("lock:order:" + orderId);
        try {
            if (!orderLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                throw new BusinessException(409, "订单正在处理中，请稍后重试");
            }

            Order order = orderMapper.selectById(orderId);
            if (order == null || !order.getUserId().equals(userId)) {
                throw new BusinessException(404, "订单不存在");
            }

            // ── 3. 状态校验：已取消/已退票/已支付 → 拒绝 ──
            if (OrderStatus.CANCELLED.getCode().equals(order.getStatus()) || OrderStatus.REFUNDED.getCode().equals(order.getStatus())) {
                throw new BusinessException(409, "订单已失效，请重新选座");
            }
            if (OrderStatus.PAID.getCode().equals(order.getStatus())) {
                throw new BusinessException(409, "订单已完成支付");
            }

            // ── 4. 场次状态校验：场次已取消/结束后不可支付（防并发竞态）──
            Schedule schedule = scheduleMapper.selectById(order.getScheduleId());
            if (schedule == null || !ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
                throw new BusinessException(409, "场次已结束或已取消，不可支付");
            }

            // ── 5. CAS 条件更新：WHERE status='PENDING' → SET status='PAID'
            //     并发请求 affected=0 直接失败，数据库级保证幂等 ──
            int affected = orderMapper.updateToPaidIfPending(orderId, LocalDateTime.now());
            if (affected == 0) {
                throw new BusinessException(409, "订单状态已变更，请刷新后重试");
            }

            // ── 6. 生成动态取票码（Redis 存储，60s 刷新，检票时验证）──
            String pickupCode = pickupCodeService.getOrCreateCode(order.getId());

            // ── 7. 更新座位状态 LOCKED → SOLD ──
            List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getOrderId, orderId)
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
            for (ScheduleSeat seat : seats) {
                seat.setStatus(ScheduleSeatStatus.SOLD.getCode());
                scheduleSeatMapper.updateById(seat);
            }

            // ── 8. 取消延迟队列中的超时取消任务（已支付，不再需要超时取消）──
            orderTimeoutService.cancel(orderId);

            // ── 9. 同步 Redis Bitmap：setSold 内部同时 SETBIT sold=1 + locked=0 ──
            //     延迟到事务提交后执行，避免回滚后缓存脏数据
            afterCommit(() -> {
                for (ScheduleSeat seat : seats) {
                    seatBitmapService.setSold(order.getScheduleId(), seat.getSeatIndex());
                }
            });

            // ── 10. 发送支付成功通知（@Async）──
            Cinema cinema = cinemaMapper.selectById(schedule.getCinemaId());
            notificationService.sendNotification(
                    userId, "PAY_SUCCESS", "支付成功",
                    "影院地址：" + (cinema != null ? cinema.getAddress() : "") + "，放映时间：" + order.getShowDate() + " " + order.getStartTime() + "，取票码：" + pickupCode,
                    orderId);

            PayResultVO vo = PayResultVO.builder()
                    .id(order.getId())
                    .orderNo(order.getOrderNo())
                    .status(OrderStatus.PAID.getCode())
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
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(500, "支付操作被中断");
        } finally {
            if (orderLock.isHeldByCurrentThread()) orderLock.unlock();
        }
    }

    /**
     * 取消订单（用户主动取消）。
     * <p>
     * 并发控制：Redisson 订单级分布式锁 + CAS 条件更新（{@code updateToCancelledIfPending}）。
     * 座位状态 LOCKED → AVAILABLE，释放 Redis Bitmap 锁定位，取消超时取消任务，清理取票码。
     */
    @Override
    @Transactional
    public void cancelOrder(Long userId, Long orderId, String requestId) {
        // ── 1. 幂等校验 ──
        String cached = idempotentService.getIfPresent(userId, requestId, String.class);
        if (cached != null) {
            return;
        }

        // ── 2. 订单级分布式锁 ──
        RLock orderLock = redissonClient.getLock("lock:order:" + orderId);
        try {
            if (!orderLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                throw new BusinessException(409, "订单正在处理中，请稍后重试");
            }

            Order order = orderMapper.selectById(orderId);
            if (order == null || !order.getUserId().equals(userId)) {
                throw new BusinessException(404, "订单不存在");
            }

            // ── 3. 状态校验：仅 PENDING 可取消 ──
            if (!OrderStatus.PENDING.getCode().equals(order.getStatus())) {
                throw new BusinessException(409, "仅待支付订单可取消");
            }

            // ── 4. CAS 更新：WHERE status='PENDING' → SET status='CANCELLED' ──
            int affected = orderMapper.updateToCancelledIfPending(orderId, LocalDateTime.now(), "用户主动取消");
            if (affected == 0) {
                throw new BusinessException(409, "订单状态已变更，请刷新后重试");
            }

            // ── 5. 释放座位：LOCKED → AVAILABLE，清除订单关联 ──
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

            // ── 6. 取消延迟队列中的超时取消任务 ──
            orderTimeoutService.cancel(orderId);

            // ── 7. 清理取票码（如有）──
            pickupCodeService.removeCode(orderId);

            // ── 8. 同步 Redis Bitmap：SETBIT locked {seatIndex} 0 ──
            //     延迟到事务提交后执行，避免回滚后缓存脏数据
            afterCommit(() -> {
                for (ScheduleSeat seat : seats) {
                    seatBitmapService.clearLocked(order.getScheduleId(), seat.getSeatIndex());
                }
            });

            // ── 9. 发送取消通知（@Async）──
            notificationService.sendNotification(
                    userId, "ORDER_CANCELLED", "订单已取消",
                    "您的订单已取消，座位已释放，如需购票请重新选座。影片：《" + order.getMovieName() + "》",
                    orderId);

            idempotentService.put(userId, requestId, "ok");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(500, "取消操作被中断");
        } finally {
            if (orderLock.isHeldByCurrentThread()) orderLock.unlock();
        }
    }

    /**
     * 退票（已支付订单退款）。
     * <p>
     * 并发控制：Redisson 订单级分布式锁 + CAS 条件更新（{@code updateToRefundedIfPaid}）。
     * 校验放映未开始后，座位状态 SOLD → AVAILABLE，清除 Redis Bitmap 已售+锁定位，清理取票码。
     */
    @Override
    @Transactional
    public void refundOrder(Long userId, Long orderId, String requestId) {
        // ── 1. 幂等校验 ──
        String cached = idempotentService.getIfPresent(userId, requestId, String.class);
        if (cached != null) {
            return;
        }

        // ── 2. 订单级分布式锁 ──
        RLock orderLock = redissonClient.getLock("lock:order:" + orderId);
        try {
            if (!orderLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                throw new BusinessException(409, "订单正在处理中，请稍后重试");
            }

            Order order = orderMapper.selectById(orderId);
            if (order == null || !order.getUserId().equals(userId)) {
                throw new BusinessException(404, "订单不存在");
            }

            // ── 3. 状态校验：仅已出票（PAID）可退票 ──
            if (!OrderStatus.PAID.getCode().equals(order.getStatus())) {
                throw new BusinessException(409, "仅已出票订单可退票");
            }

            // ── 4. 放映时间校验：放映已开始则不可退票 ──
            Schedule schedule = scheduleMapper.selectById(order.getScheduleId());
            if (schedule != null) {
                LocalDateTime showDateTime = LocalDateTime.of(schedule.getShowDate(), schedule.getStartTime());
                if (LocalDateTime.now().isAfter(showDateTime)) {
                    throw new BusinessException(409, "放映已开始，不可退票");
                }
            }

            // ── 5. CAS 更新：WHERE status='PAID' → SET status='REFUNDED' ──
            int affected = orderMapper.updateToRefundedIfPaid(orderId, LocalDateTime.now(), "用户退票");
            if (affected == 0) {
                throw new BusinessException(409, "订单状态已变更，请刷新后重试");
            }

            // ── 6. 释放座位：SOLD → AVAILABLE，清除订单关联 ──
            List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getOrderId, orderId)
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
            for (ScheduleSeat seat : seats) {
                seat.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
                seat.setOrderId(null);
                scheduleSeatMapper.updateById(seat);
            }

            // ── 7. 同步 Redis Bitmap：SETBIT sold=0 + locked=0（clearSoldAndLocked 一次清除两个 bit）──
            //     延迟到事务提交后执行，避免回滚后缓存脏数据
            afterCommit(() -> {
                for (ScheduleSeat seat : seats) {
                    seatBitmapService.clearSoldAndLocked(order.getScheduleId(), seat.getSeatIndex());
                }
            });

            // ── 8. 清理取票码 + 发送退票通知（@Async）──
            pickupCodeService.removeCode(orderId);
            notificationService.sendNotification(
                    userId, "REFUND_SUCCESS", "退票成功",
                    "退票成功，订单已取消，座位已释放。影片：《" + order.getMovieName() + "》，退款金额：¥" + order.getTotalAmount(),
                    orderId);

            idempotentService.put(userId, requestId, "ok");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(500, "退票操作被中断");
        } finally {
            if (orderLock.isHeldByCurrentThread()) orderLock.unlock();
        }
    }

    /** 用户端订单分页查询，按状态/日期/影片名筛选。 */
    @Override
    public PageResult<OrderListVO> listOrders(Long userId, String status, String dateFrom, String dateTo, String keyword, Integer page, Integer size) {
        int normalizedPage = PageUtil.normalizePage(page);
        int normalizedSize = PageUtil.normalizeSize(size);
        Page<Order> pageParam = new Page<>(normalizedPage, normalizedSize);
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

        return new PageResult<>(result.getTotal(), normalizedPage, normalizedSize, records);
    }

    /** 订单详情，仅已支付订单返回动态取票码。 */
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
        Schedule schedule = scheduleMapper.selectById(order.getScheduleId());
        Cinema cinema = cinemaMapper.selectById(schedule != null ? schedule.getCinemaId() : null);
        vo.setCinemaAddress(cinema != null ? cinema.getAddress() : null);
        return vo;
    }

    /**
     * 查询用户当前待支付订单。
     * <p>
     * 若订单已超时但数据库状态仍为 PENDING，通过 self 代理调用 {@link #timeoutCancel} 同步取消。
     */
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
            // 通过代理调用，确保 @Transactional 生效
            self.timeoutCancel(order.getId());
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

    /** 查询待支付订单剩余支付时间，已过期或非待支付状态返回 expired=true。 */
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

    /** 获取动态取票码（Redis 存储定时刷新），仅已出票订单可获取。 */
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

    /**
     * Agent 服务内部锁座入口。
     * <p>
     * 通过 self 代理调用 {@link #lockSeat}，确保 {@code @Transactional} 在 {@link #doLockSeat} 中生效。
     */
    @Override
    public LockSeatResultVO internalLockSeat(InternalLockSeatDTO dto) {
        LockSeatDTO lockSeatDTO = LockSeatDTO.builder()
                .scheduleId(dto.getScheduleId())
                .seatIds(dto.getSeatIds())
                .ticketCount(dto.getTicketCount())
                .build();
        return self.lockSeat(dto.getUserId(), lockSeatDTO, dto.getRequestId());
    }

    /** Agent 服务内部支付入口，通过 self 代理确保 {@code @Transactional} 生效。 */
    @Override
    public PayResultVO internalPayOrder(Long userId, Long orderId, String requestId) {
        return self.payOrder(userId, orderId, requestId);
    }

    /** Agent 服务内部取消入口，通过 self 代理确保 {@code @Transactional} 生效。 */
    @Override
    public void internalCancelOrder(Long userId, Long orderId, String requestId) {
        self.cancelOrder(userId, orderId, requestId);
    }

    /** Agent 服务内部退票入口，通过 self 代理确保 {@code @Transactional} 生效。 */
    @Override
    public void internalRefundOrder(Long userId, Long orderId, String requestId) {
        self.refundOrder(userId, orderId, requestId);
    }

    /** Agent 服务内部订单分页查询，支持按影片名/影院名/订单号模糊搜索。 */
    @Override
    public PageResult<OrderListVO> internalListOrders(Long userId, String keyword, String status, String dateFrom, String dateTo, Integer page, Integer size) {
        int normalizedPage = PageUtil.normalizePage(page);
        int normalizedSize = PageUtil.normalizeSize(size);
        Page<Order> pageParam = new Page<>(normalizedPage, normalizedSize);
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

        return new PageResult<>(result.getTotal(), normalizedPage, normalizedSize, records);
    }

    /**
     * 超时取消单个订单（延迟队列触发或定时扫描触发）。
     * <p>
     * 并发控制：Redisson 订单级锁 + CAS 条件更新（{@code updateToCancelledIfPending}）。
     * CAS 幂等保证重复触发安全。座位状态 LOCKED → AVAILABLE，释放 Redis Bitmap 锁定位。
     */
    @Override
    @Transactional
    public void timeoutCancel(Long orderId) {
        RLock orderLock = redissonClient.getLock("lock:order:" + orderId);
        try {
            if (!orderLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                // 其他线程正在处理（可能是用户正在支付），跳过
                log.warn("Order {} is being processed by another thread, skipping timeout cancel", orderId);
                return;
            }

            Order order = orderMapper.selectById(orderId);
            if (order == null) {
                throw new BusinessException(404, "订单不存在");
            }
            // 幂等：已支付或已取消则跳过（延迟队列和定时任务可能重复触发）
            if (!OrderStatus.PENDING.getCode().equals(order.getStatus())) {
                log.info("Order {} already {}, skipping timeout cancel", orderId, order.getStatus());
                throw new BusinessException(409, "订单状态非待支付，无法超时取消");
            }

            // CAS 更新：WHERE status='PENDING' → SET status='CANCELLED'
            // affected=0 说明并发支付已先一步 CAS 为 PAID，放弃取消
            int affected = orderMapper.updateToCancelledIfPending(orderId, LocalDateTime.now(), "超时取消");
            if (affected == 0) {
                log.info("Order {} status changed concurrently, skipping timeout cancel", orderId);
                return;
            }

            // 释放座位 LOCKED → AVAILABLE
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
            // 同步 Redis Bitmap：SETBIT locked {seatIndex} 0
            // 延迟到事务提交后执行，避免回滚后缓存脏数据
            afterCommit(() -> {
                for (ScheduleSeat seat : seats) {
                    seatBitmapService.clearLocked(order.getScheduleId(), seat.getSeatIndex());
                }
            });
            notificationService.sendNotification(
                    order.getUserId(), "TIMEOUT_CANCEL", "订单超时取消",
                    "您的订单已超时取消，座位已释放，如需购票请重新选座。影片：《" + order.getMovieName() + "》",
                    orderId);

            log.info("Order {} timeout cancelled", orderId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Timeout cancel for order {} was interrupted", orderId);
        } finally {
            if (orderLock.isHeldByCurrentThread()) orderLock.unlock();
        }
    }

    /**
     * 定时扫描（每 60s）超时未支付订单并取消，作为延迟队列的兜底补偿。
     * <p>
     * 查询所有 PENDING 且创建时间早于 deadline 的订单，逐个通过 self 代理调用 {@link #timeoutCancel}。
     */
    @Scheduled(fixedRate = 60000)
    public void scanTimeoutOrders() {
        LocalDateTime deadline = LocalDateTime.now().minusSeconds(ORDER_TIMEOUT_SECONDS);
        List<Order> timeoutOrders = orderMapper.selectList(
                new LambdaQueryWrapper<Order>()
                        .eq(Order::getStatus, OrderStatus.PENDING.getCode())
                        .lt(Order::getCreatedAt, deadline));
        for (Order order : timeoutOrders) {
            try {
                self.timeoutCancel(order.getId());
            } catch (Exception e) {
                log.error("Error cancelling timeout order {}", order.getId(), e);
            }
        }
        if (!timeoutOrders.isEmpty()) {
            log.info("Scanned and cancelled {} timeout orders", timeoutOrders.size());
        }
    }

    /** 生成订单号：时间戳(14位) + 随机数(6位)。 */
    private String generateOrderNo() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%06d", java.util.concurrent.ThreadLocalRandom.current().nextInt(1000000));
    }

    /**
     * 在事务提交后执行操作，确保数据库已持久化后再更新 Redis 缓存，
     * 避免事务回滚后缓存与数据库不一致。
     */
    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            action.run();
                        }
                    }
            );
        } else {
            action.run();
        }
    }

    /** Order → OrderListVO 转换，待支付订单计算剩余支付倒计时。 */
    private OrderListVO toListVO(Order order) {
        OrderListVO vo = new OrderListVO();
        BeanUtils.copyProperties(order, vo);
        if (OrderStatus.PENDING.getCode().equals(order.getStatus()) && order.getCreatedAt() != null) {
            int remaining = ORDER_TIMEOUT_SECONDS - (int) java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).getSeconds();
            vo.setRemainingSeconds(Math.max(0, remaining));
        }
        return vo;
    }
}
