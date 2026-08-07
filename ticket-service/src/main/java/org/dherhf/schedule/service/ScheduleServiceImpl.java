package org.dherhf.schedule.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.cinema.enums.CinemaStatus;
import org.dherhf.cinema.enums.HallStatus;
import org.dherhf.cinema.vo.SeatVO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.schedule.enums.ScheduleSeatStatus;
import org.dherhf.schedule.enums.ScheduleStatus;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.schedule.dto.ScheduleCreateDTO;
import org.dherhf.schedule.dto.ScheduleUpdateDTO;
import org.dherhf.movie.entity.Movie;
import org.dherhf.movie.enums.MovieStatus;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.ScheduleVO;
import org.dherhf.schedule.vo.SeatMapVO;
import org.springframework.beans.BeanUtils;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleMapper scheduleMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;
    private final MovieMapper movieMapper;
    private final CinemaMapper cinemaMapper;
    private final HallMapper hallMapper;
    private final HallCellMapper hallCellMapper;
    private final org.dherhf.notification.service.NotificationService notificationService;
    private final org.dherhf.order.mapper.OrderMapper orderMapper;
    private final SeatBitmapService seatBitmapService;

    @Override
    @Transactional
    public ScheduleVO createSchedule(ScheduleCreateDTO dto) {
        Movie movie = movieMapper.selectById(dto.getMovieId());
        if (movie == null || movie.getStatus() != MovieStatus.ONLINE.getCode()) {
            throw new BusinessException(400, "影片不存在或未上架");
        }

        Cinema cinema = cinemaMapper.selectById(dto.getCinemaId());
        if (cinema == null || cinema.getStatus() != CinemaStatus.OPEN.getCode()) {
            throw new BusinessException(400, "影院不存在或已停业");
        }

        Hall hall = hallMapper.selectById(dto.getHallId());
        if (hall == null || hall.getStatus() != HallStatus.ACTIVE.getCode() || !hall.getCinemaId().equals(dto.getCinemaId())) {
            throw new BusinessException(400, "影厅不存在或未启用");
        }

        if (dto.getShowDate().isBefore(LocalDate.now())) {
            throw new BusinessException(400, "放映日期不可早于当前日期");
        }

        LocalTime endTime = dto.getEndTime();
        if (endTime == null) {
            endTime = dto.getStartTime().plusMinutes(movie.getDuration());
        }

        // 排片冲突校验
        checkConflict(dto.getHallId(), dto.getShowDate(), dto.getStartTime(), endTime, null);

        // 查询影厅座位数
        List<HallCell> seatCells = hallCellMapper.selectList(
                new LambdaQueryWrapper<HallCell>()
                        .eq(HallCell::getHallId, dto.getHallId())
                        .eq(HallCell::getCellType, "seat")
                        .orderByAsc(HallCell::getRowIndex)
                        .orderByAsc(HallCell::getColIndex));

        Schedule schedule = new Schedule();
        BeanUtils.copyProperties(dto, schedule);
        schedule.setEndTime(endTime);
        schedule.setTotalSeats(seatCells.size());
        schedule.setStatus(ScheduleStatus.ON_SALE.getCode());
        scheduleMapper.insert(schedule);

        // 批量生成场次座位
        int seatIndex = 0;
        for (HallCell cell : seatCells) {
            ScheduleSeat ss = ScheduleSeat.builder()
                    .scheduleId(schedule.getId())
                    .hallCellId(cell.getId())
                    .seatIndex(seatIndex++)
                    .status(ScheduleSeatStatus.AVAILABLE.getCode())
                    .build();
            scheduleSeatMapper.insert(ss);
        }

        // 初始化 Redis Bitmap (全 0)
        seatBitmapService.initBitmap(schedule.getId(), seatCells.size());

        ScheduleVO vo = new ScheduleVO();
        BeanUtils.copyProperties(schedule, vo);
        return vo;
    }

    @Override
    @Transactional
    public ScheduleVO updateSchedule(Long id, ScheduleUpdateDTO dto) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        if (!ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(409, "仅可售场次可修改");
        }

        // 检查是否有已售座位
        Long soldCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));

        boolean coreFieldChanged = isCoreFieldChanged(schedule, dto);

        if (soldCount > 0 && coreFieldChanged) {
            throw new BusinessException(409, "已有售票，不可修改影厅/日期/时间");
        }

        LocalTime newEndTime = dto.getEndTime();
        if (newEndTime == null && dto.getStartTime() != null) {
            Movie movie = movieMapper.selectById(schedule.getMovieId());
            newEndTime = dto.getStartTime().plusMinutes(movie.getDuration());
        }

        if (coreFieldChanged) {
            LocalTime startTime = dto.getStartTime() != null ? dto.getStartTime() : schedule.getStartTime();
            LocalTime endTime = newEndTime != null ? newEndTime : schedule.getEndTime();
            LocalDate showDate = dto.getShowDate() != null ? dto.getShowDate() : schedule.getShowDate();
            Long hallId = dto.getHallId() != null ? dto.getHallId() : schedule.getHallId();

            checkConflict(hallId, showDate, startTime, endTime, id);
        }

        if (dto.getHallId() != null && !dto.getHallId().equals(schedule.getHallId())) {
            // 更换影厅，重新生成座位
            scheduleSeatMapper.delete(
                    new LambdaQueryWrapper<ScheduleSeat>().eq(ScheduleSeat::getScheduleId, id));

            List<HallCell> seatCells = hallCellMapper.selectList(
                    new LambdaQueryWrapper<HallCell>()
                            .eq(HallCell::getHallId, dto.getHallId())
                            .eq(HallCell::getCellType, "seat")
                            .orderByAsc(HallCell::getRowIndex)
                            .orderByAsc(HallCell::getColIndex));

            schedule.setTotalSeats(seatCells.size());
            int seatIndex = 0;
            for (HallCell cell : seatCells) {
                ScheduleSeat ss = ScheduleSeat.builder()
                        .scheduleId(id)
                        .hallCellId(cell.getId())
                        .seatIndex(seatIndex++)
                        .status(ScheduleSeatStatus.AVAILABLE.getCode())
                        .build();
                scheduleSeatMapper.insert(ss);
            }

            // 重建 Redis Bitmap
            List<ScheduleSeat> newSeats = scheduleSeatMapper.selectList(
                    new LambdaQueryWrapper<ScheduleSeat>().eq(ScheduleSeat::getScheduleId, id));
            seatBitmapService.rebuildBitmap(id, newSeats);
        }

        if (dto.getShowDate() != null) schedule.setShowDate(dto.getShowDate());
        if (dto.getStartTime() != null) schedule.setStartTime(dto.getStartTime());
        if (newEndTime != null) schedule.setEndTime(newEndTime);
        if (dto.getPrice() != null) schedule.setPrice(dto.getPrice());
        if (dto.getLanguageVersion() != null) schedule.setLanguageVersion(dto.getLanguageVersion());
        if (dto.getHallId() != null) schedule.setHallId(dto.getHallId());

        scheduleMapper.updateById(schedule);

        ScheduleVO vo = new ScheduleVO();
        BeanUtils.copyProperties(schedule, vo);
        return vo;
    }

    @Override
    @Transactional
    public void cancelSchedule(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        if (!ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(409, "仅可取消在售场次");
        }

        Long soldCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
        if (soldCount > 0) {
            throw new BusinessException(409, "已有售票，不可取消");
        }

        schedule.setStatus(ScheduleStatus.CANCELLED.getCode());
        scheduleMapper.updateById(schedule);

        // 释放所有锁定座位
        List<ScheduleSeat> lockedSeats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
        for (ScheduleSeat ss : lockedSeats) {
            ss.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
            ss.setLockedAt(null);
            ss.setOrderId(null);
            scheduleSeatMapper.updateById(ss);
        }

        // 通知取消关联的未支付订单
        List<org.dherhf.order.entity.Order> pendingOrders = orderMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<org.dherhf.order.entity.Order>()
                        .eq(org.dherhf.order.entity.Order::getScheduleId, id)
                        .eq(org.dherhf.order.entity.Order::getStatus, org.dherhf.order.enums.OrderStatus.PENDING.getCode()));
        for (org.dherhf.order.entity.Order order : pendingOrders) {
            order.setStatus(org.dherhf.order.enums.OrderStatus.CANCELLED.getCode());
            order.setCancelledAt(java.time.LocalDateTime.now());
            order.setCancelReason("场次已取消");
            orderMapper.updateById(order);
            notificationService.sendNotification(
                    order.getUserId(), "SCHEDULE_CHANGE", "场次已取消",
                    "您预订的《" + order.getMovieName() + "》场次已取消，座位已释放。",
                    order.getId());
        }

        // 删除 Redis Bitmap 缓存
        seatBitmapService.deleteBitmap(id);
    }

    @Override
    @Transactional
    public void restoreSchedule(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        if (!ScheduleStatus.CANCELLED.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(409, "仅已取消场次可恢复");
        }

        // 检查放映日期是否已过期
        if (schedule.getShowDate().isBefore(LocalDate.now())) {
            throw new BusinessException(409, "放映日期已过期，不可恢复");
        }

        // 检查影厅在该时段是否有冲突的在售场次
        checkConflict(schedule.getHallId(), schedule.getShowDate(), schedule.getStartTime(), schedule.getEndTime(), id);

        schedule.setStatus(ScheduleStatus.ON_SALE.getCode());
        scheduleMapper.updateById(schedule);

        // 恢复 Redis Bitmap
        List<ScheduleSeat> seats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>().eq(ScheduleSeat::getScheduleId, id));
        seatBitmapService.rebuildBitmap(id, seats);
    }

    @Override
    @Transactional
    public void endSchedule(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        if (ScheduleStatus.ENDED.getCode().equals(schedule.getStatus())) {
            return;
        }
        if (!ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(409, "仅可结束在售场次");
        }

        schedule.setStatus(ScheduleStatus.ENDED.getCode());
        scheduleMapper.updateById(schedule);

        // 释放锁定座位
        List<ScheduleSeat> lockedSeats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
        for (ScheduleSeat ss : lockedSeats) {
            ss.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
            ss.setLockedAt(null);
            ss.setOrderId(null);
            scheduleSeatMapper.updateById(ss);
        }

        // 已出票订单置为已过期(场次已结束,不可再检票)
        expirePaidOrders(id);

        // 删除 Redis Bitmap 缓存
        seatBitmapService.deleteBitmap(id);
    }

    @Override
    public PageResult<ScheduleListVO> adminList(Long movieId, Long cinemaId, Long hallId, String showDate, String status, Integer page, Integer size) {
        Page<Schedule> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Schedule> wrapper = new LambdaQueryWrapper<Schedule>()
                .eq(movieId != null, Schedule::getMovieId, movieId)
                .eq(cinemaId != null, Schedule::getCinemaId, cinemaId)
                .eq(hallId != null, Schedule::getHallId, hallId)
                .eq(showDate != null && !showDate.isBlank(), Schedule::getShowDate, showDate != null ? LocalDate.parse(showDate) : null)
                .eq(status != null && !status.isBlank(), Schedule::getStatus, status)
                .orderByDesc(Schedule::getCreatedAt);

        IPage<Schedule> result = scheduleMapper.selectPage(pageParam, wrapper);
        List<ScheduleListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    public ScheduleDetailVO adminDetail(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        return toDetailVO(schedule);
    }

    @Override
    public PageResult<ScheduleListVO> userList(Long movieId, String movieName, Long cinemaId, String showDate, Integer page, Integer size) {
        Page<Schedule> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Schedule> wrapper = new LambdaQueryWrapper<Schedule>()
                .eq(Schedule::getStatus, ScheduleStatus.ON_SALE.getCode())
                .eq(movieId != null, Schedule::getMovieId, movieId)
                .eq(cinemaId != null, Schedule::getCinemaId, cinemaId)
                .eq(showDate != null && !showDate.isBlank(), Schedule::getShowDate, showDate != null ? LocalDate.parse(showDate) : null)
                .ge(Schedule::getShowDate, LocalDate.now())
                .orderByAsc(Schedule::getShowDate)
                .orderByAsc(Schedule::getStartTime);

        if (movieName != null && !movieName.isBlank()) {
            List<Movie> movies = movieMapper.selectList(
                    new LambdaQueryWrapper<Movie>().like(Movie::getName, movieName));
            if (movies.isEmpty()) {
                return new PageResult<>(0L, page, size, List.of());
            }
            wrapper.in(Schedule::getMovieId, movies.stream().map(Movie::getId).collect(Collectors.toList()));
        }

        IPage<Schedule> result = scheduleMapper.selectPage(pageParam, wrapper);
        List<ScheduleListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    public ScheduleDetailVO userDetail(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null || !ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(404, "场次不存在");
        }
        return toDetailVO(schedule);
    }

    @Override
    public SeatMapVO getSeatMap(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null || !ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(404, "场次不存在");
        }

        Hall hall = hallMapper.selectById(schedule.getHallId());
        List<ScheduleSeat> scheduleSeats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .orderByAsc(ScheduleSeat::getSeatIndex));

        List<HallCell> hallCells = hallCellMapper.selectList(
                new LambdaQueryWrapper<HallCell>()
                        .eq(HallCell::getHallId, schedule.getHallId())
                        .eq(HallCell::getCellType, "seat")
                        .orderByAsc(HallCell::getRowIndex)
                        .orderByAsc(HallCell::getColIndex));

        List<SeatVO> seats = new ArrayList<>();
        int availableCount = 0;
        for (ScheduleSeat ss : scheduleSeats) {
            Integer rowIndex = null;
            Integer colIndex = null;
            String seatLabel = null;
            String seatCategory = null;
            for (HallCell hc : hallCells) {
                if (hc.getId().equals(ss.getHallCellId())) {
                    rowIndex = hc.getRowIndex();
                    colIndex = hc.getColIndex();
                    seatLabel = hc.getSeatLabel();
                    seatCategory = hc.getSeatCategory();
                    break;
                }
            }
            SeatVO seatVO = SeatVO.builder()
                    .hallCellId(ss.getHallCellId())
                    .seatIndex(ss.getSeatIndex())
                    .status(ss.getStatus())
                    .rowIndex(rowIndex)
                    .colIndex(colIndex)
                    .seatLabel(seatLabel)
                    .seatCategory(seatCategory)
                    .build();
            if (ScheduleSeatStatus.AVAILABLE.getCode().equals(ss.getStatus())) {
                availableCount++;
            }
            seats.add(seatVO);
        }

        // 座位状态优先从 Redis Bitmap 批量获取，缓存未命中时从 MySQL 重建并回写
        String[] seatStatuses = seatBitmapService.getSeatStatuses(id, schedule.getTotalSeats());
        if (seatStatuses != null) {
            availableCount = 0;
            for (SeatVO seatVO : seats) {
                int idx = seatVO.getSeatIndex();
                if (idx < seatStatuses.length) {
                    String status = seatStatuses[idx];
                    if (status != null) {
                        seatVO.setStatus(status);
                    }
                }
                if (ScheduleSeatStatus.AVAILABLE.getCode().equals(seatVO.getStatus())) {
                    availableCount++;
                }
            }
        } else {
            // 缓存未命中，从 MySQL 重建并回写
            seatBitmapService.rebuildBitmap(id, scheduleSeats);
        }

        return SeatMapVO.builder()
                .scheduleId(id)
                .hallId(schedule.getHallId())
                .totalRows(hall != null ? hall.getTotalRows() : 0)
                .totalCols(hall != null ? hall.getTotalCols() : 0)
                .totalSeats(schedule.getTotalSeats())
                .availableSeats(availableCount)
                .price(schedule.getPrice())
                .seats(seats)
                .build();
    }

    @Override
    @Transactional
    public void autoEndExpiredSchedules() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Schedule> expired = scheduleMapper.selectList(
                new LambdaQueryWrapper<Schedule>()
                        .eq(Schedule::getStatus, ScheduleStatus.ON_SALE.getCode())
                        .and(w -> w
                                .lt(Schedule::getShowDate, today)
                                .or(o -> o
                                        .eq(Schedule::getShowDate, today)
                                        .le(Schedule::getEndTime, now))));

        for (Schedule schedule : expired) {
            try {
                schedule.setStatus(ScheduleStatus.ENDED.getCode());
                scheduleMapper.updateById(schedule);

                List<ScheduleSeat> lockedSeats = scheduleSeatMapper.selectList(
                        new LambdaQueryWrapper<ScheduleSeat>()
                                .eq(ScheduleSeat::getScheduleId, schedule.getId())
                                .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
                for (ScheduleSeat ss : lockedSeats) {
                    ss.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
                    ss.setLockedAt(null);
                    ss.setOrderId(null);
                    scheduleSeatMapper.updateById(ss);
                }

                List<org.dherhf.order.entity.Order> pendingOrders = orderMapper.selectList(
                        new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<org.dherhf.order.entity.Order>()
                                .eq(org.dherhf.order.entity.Order::getScheduleId, schedule.getId())
                                .eq(org.dherhf.order.entity.Order::getStatus, org.dherhf.order.enums.OrderStatus.PENDING.getCode()));
                for (org.dherhf.order.entity.Order order : pendingOrders) {
                    order.setStatus(org.dherhf.order.enums.OrderStatus.CANCELLED.getCode());
                    order.setCancelledAt(java.time.LocalDateTime.now());
                    order.setCancelReason("场次已结束");
                    orderMapper.updateById(order);
                    notificationService.sendNotification(
                            order.getUserId(), "TIMEOUT_CANCEL", "场次已结束",
                            "您预订的《" + order.getMovieName() + "》场次已结束，待支付订单已自动取消。",
                            order.getId());
                }

                // 已出票订单置为已过期(场次已结束,不可再检票)
                expirePaidOrders(schedule.getId());
            } catch (Exception e) {
                log.error("Error auto-ending schedule {}", schedule.getId(), e);
            }
        }

        if (!expired.isEmpty()) {
            log.info("Auto-ended {} expired schedules", expired.size());
        }
    }

    @Scheduled(fixedRate = 60000)
    public void scanExpiredSchedules() {
        autoEndExpiredSchedules();
    }

    /**
     * 将指定场次下已出票(paid)订单置为已过期(expired)。
     * 场次结束后票据失效,不可再检票/退票。座位不释放(场次已结束,无需回收)。
     */
    private void expirePaidOrders(Long scheduleId) {
        List<org.dherhf.order.entity.Order> paidOrders = orderMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<org.dherhf.order.entity.Order>()
                        .eq(org.dherhf.order.entity.Order::getScheduleId, scheduleId)
                        .eq(org.dherhf.order.entity.Order::getStatus, org.dherhf.order.enums.OrderStatus.PAID.getCode()));
        for (org.dherhf.order.entity.Order order : paidOrders) {
            order.setStatus(org.dherhf.order.enums.OrderStatus.EXPIRED.getCode());
            orderMapper.updateById(order);
            notificationService.sendNotification(
                    order.getUserId(), "EXPIRED", "场次已结束",
                    "您购买的《" + order.getMovieName() + "》场次已结束，票据已失效。",
                    order.getId());
        }
        if (!paidOrders.isEmpty()) {
            log.info("Expired {} paid orders for schedule {}", paidOrders.size(), scheduleId);
        }
    }

    private void checkConflict(Long hallId, LocalDate showDate, LocalTime startTime, LocalTime endTime, Long excludeId) {
        List<Schedule> conflicts = scheduleMapper.selectList(
                new LambdaQueryWrapper<Schedule>()
                        .eq(Schedule::getHallId, hallId)
                        .eq(Schedule::getShowDate, showDate)
                        .eq(Schedule::getStatus, ScheduleStatus.ON_SALE.getCode())
                        .ne(excludeId != null, Schedule::getId, excludeId)
                        .lt(Schedule::getStartTime, endTime)
                        .gt(Schedule::getEndTime, startTime));
        if (!conflicts.isEmpty()) {
            Movie conflictMovie = movieMapper.selectById(conflicts.getFirst().getMovieId());
            String movieName = conflictMovie != null ? conflictMovie.getName() : "未知影片";
            throw new BusinessException(409, "该影厅在此时段已有排片《" + movieName + "》");
        }
    }

    private boolean isCoreFieldChanged(Schedule schedule, ScheduleUpdateDTO dto) {
        return (dto.getHallId() != null && !dto.getHallId().equals(schedule.getHallId())) ||
                (dto.getShowDate() != null && !dto.getShowDate().equals(schedule.getShowDate())) ||
                (dto.getStartTime() != null && !dto.getStartTime().equals(schedule.getStartTime())) ||
                (dto.getEndTime() != null && !dto.getEndTime().equals(schedule.getEndTime()));
    }

    private ScheduleListVO toListVO(Schedule schedule) {
        ScheduleListVO vo = new ScheduleListVO();
        BeanUtils.copyProperties(schedule, vo);

        Movie movie = movieMapper.selectById(schedule.getMovieId());
        if (movie != null) vo.setMovieName(movie.getName());

        Cinema cinema = cinemaMapper.selectById(schedule.getCinemaId());
        if (cinema != null) vo.setCinemaName(cinema.getName());

        Hall hall = hallMapper.selectById(schedule.getHallId());
        if (hall != null) vo.setHallName(hall.getName());

        // 优先从 Redis Bitmap BITCOUNT 获取
        long occupiedCount = seatBitmapService.getOccupiedCount(schedule.getId());
        long soldCount = seatBitmapService.getSoldCount(schedule.getId());
        if (occupiedCount < 0 || soldCount < 0) {
            // 缓存未命中，降级查 MySQL
            Long lockedCount = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getScheduleId, schedule.getId())
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
            Long soldCountDb = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getScheduleId, schedule.getId())
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
            occupiedCount = lockedCount + soldCountDb;
            soldCount = soldCountDb;
        }

        int occupied = (int) occupiedCount;
        vo.setAvailableSeats(schedule.getTotalSeats() - occupied);
        vo.setSoldSeats((int) soldCount);
        if (schedule.getTotalSeats() > 0) {
            vo.setOccupancyRate((double) soldCount / schedule.getTotalSeats());
        }

        return vo;
    }

    private ScheduleDetailVO toDetailVO(Schedule schedule) {
        ScheduleDetailVO vo = new ScheduleDetailVO();
        BeanUtils.copyProperties(schedule, vo);

        Movie movie = movieMapper.selectById(schedule.getMovieId());
        if (movie != null) {
            vo.setMovieName(movie.getName());
            vo.setMoviePosterUrl(movie.getPosterUrl());
            vo.setMovieDuration(movie.getDuration());
        }

        Cinema cinema = cinemaMapper.selectById(schedule.getCinemaId());
        if (cinema != null) {
            vo.setCinemaName(cinema.getName());
            vo.setCinemaAddress(cinema.getAddress());
        }

        Hall hall = hallMapper.selectById(schedule.getHallId());
        if (hall != null) {
            vo.setHallName(hall.getName());
            vo.setHallScreenType(hall.getScreenType());
        }

        // 优先从 Redis Bitmap 获取
        long occupiedCount = seatBitmapService.getOccupiedCount(schedule.getId());
        long soldCount = seatBitmapService.getSoldCount(schedule.getId());
        if (occupiedCount < 0 || soldCount < 0) {
            // 缓存未命中，降级查 MySQL
            Long lockedCount = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getScheduleId, schedule.getId())
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
            Long soldCountDb = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getScheduleId, schedule.getId())
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
            occupiedCount = lockedCount + soldCountDb;
            soldCount = soldCountDb;
            long lockedCountLong = lockedCount;
            vo.setLockedSeats((int) lockedCountLong);
        } else {
            vo.setLockedSeats((int) (occupiedCount - soldCount));
        }

        vo.setSoldSeats((int) soldCount);
        vo.setAvailableSeats(schedule.getTotalSeats() - (int) occupiedCount);
        if (schedule.getTotalSeats() > 0) {
            vo.setOccupancyRate((double) soldCount / schedule.getTotalSeats());
        }

        return vo;
    }
}
