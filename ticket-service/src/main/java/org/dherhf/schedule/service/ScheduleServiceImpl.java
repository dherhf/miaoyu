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

/**
 * 场次服务实现。
 * <p>
 * 管理场次的创建、编辑、取消/恢复/结束/删除，以及用户端列表/详情/座位图查询。
 * 座位状态使用 Redis Bitmap 加速读取，MySQL 为权威数据源。
 */
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

    /**
     * 新增场次（排片）。
     * <p>
     * 校验影片是否上架、影院是否营业、影厅是否启用且归属正确，
     * 校验放映日期不早于当天，检查影厅时段排片冲突，
     * 然后创建场次记录、批量生成座位、初始化 Redis Bitmap。
     *
     * @param dto 场次创建参数
     * @return 新建场次信息
     */
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

    /**
     * 编辑场次信息。
     * <p>
     * 仅可售场次可修改；若已有售票则不可修改影厅/日期/时间等核心字段。
     * 更换影厅时重新生成座位并重建 Redis Bitmap；修改核心字段时重新检查排片冲突。
     *
     * @param id  场次ID
     * @param dto 场次更新参数
     * @return 更新后的场次信息
     */
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

    /**
     * 取消场次。
     * <p>
     * 仅可取消在售场次，已有售票的场次不可取消。取消后释放所有锁定座位，
     * 关联的未支付订单自动取消并发送通知，清理 Redis Bitmap 缓存。
     *
     * @param id 场次ID
     */
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

        // 释放场次的所有锁定座位
        releaseLockedSeats(id);

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

    /**
     * 恢复已取消的场次。
     * <p>
     * 仅已取消场次可恢复，放映日期不可过期，恢复前检查影厅时段排片冲突，
     * 恢复后重建 Redis Bitmap 座位状态缓存。
     *
     * @param id 场次ID
     */
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

    /**
     * 结束场次。
     * <p>
     * 将在售场次置为已结束状态，释放所有锁定座位，
     * 已出票订单置为已过期（不可再检票），清理 Redis Bitmap 缓存。
     *
     * @param id 场次ID
     */
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

        // 释放场次所有的锁定座位
        releaseLockedSeats(id);

        // 已出票订单置为已过期(场次已结束,不可再检票)
        expirePaidOrders(id);

        // 删除 Redis Bitmap 缓存
        seatBitmapService.deleteBitmap(id);
    }

    /**
     * 删除场次。
     * <p>
     * 在售场次不可删除（需先取消），存在已售座的场次无法删除。
     * 删除后同步清理座位数据和 Redis Bitmap 缓存。
     *
     * @param id 场次ID
     */
    @Override
    @Transactional
    public void deleteSchedule(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        if (ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(409, "在售场次不可删除，请先取消");
        }

        Long soldCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
        if (soldCount > 0) {
            throw new BusinessException(409, "该场次存在已售票，无法删除");
        }

        scheduleSeatMapper.delete(
                new LambdaQueryWrapper<ScheduleSeat>().eq(ScheduleSeat::getScheduleId, id));
        scheduleMapper.deleteById(id);
        seatBitmapService.deleteBitmap(id);
    }

    /**
     * 查询管理端场次列表（分页）。
     * <p>
     * 支持按影片、影院、影厅、放映日期、场次状态过滤，按创建时间倒序排列。
     * 返回结果包含影片名、影院名、影厅名及座位售卖统计（锁定/已售/可选/上座率）。
     *
     * @param movieId  影片ID，可选过滤条件
     * @param cinemaId 影院ID，可选过滤条件
     * @param hallId   影厅ID，可选过滤条件
     * @param showDate 放映日期字符串，可选过滤条件
     * @param status   场次状态，可选过滤条件
     * @param page     页码，从1开始
     * @param size     每页条数
     * @return 分页场次列表结果
     */
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

    /**
     * 查询管理端场次详情。
     * <p>
     * 返回场次完整信息，包括影片名称/海报/时长、影院名称/地址、影厅名称/屏幕类型，
     * 以及座位统计（锁定/已售/可选/上座率）。
     *
     * @param id 场次ID
     * @return 场次详情
     */
    @Override
    public ScheduleDetailVO adminDetail(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        return toDetailVO(schedule);
    }

    /**
     * 查询用户端场次列表（分页）。
     * <p>
     * 仅返回可售状态且放映日期不早于当天的场次，按放映日期和开始时间升序排列。
     * 支持按影片ID、影片名称（模糊）、影院ID、放映日期过滤。
     *
     * @param movieId   影片ID，可选过滤条件
     * @param movieName 影片名称（模糊匹配），可选过滤条件
     * @param cinemaId  影院ID，可选过滤条件
     * @param showDate  放映日期字符串，可选过滤条件
     * @param page      页码，从1开始
     * @param size      每页条数
     * @return 分页场次列表结果
     */
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

    /**
     * 查询用户端场次详情。
     * <p>
     * 仅返回可售状态的场次详情，包含影片/影院/影厅信息及座位统计。
     *
     * @param id 场次ID
     * @return 场次详情
     */
    @Override
    public ScheduleDetailVO userDetail(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null || !ScheduleStatus.ON_SALE.getCode().equals(schedule.getStatus())) {
            throw new BusinessException(404, "场次不存在");
        }
        return toDetailVO(schedule);
    }

    /**
     * 查询场次座位图。
     * <p>
     * 返回场次所有座位的排布及状态信息。优先从 Redis Bitmap 读取座位状态，
     * 缓存未命中时从 MySQL 重建并回写，确保返回最新状态。
     * 同时统计可选座位数。
     *
     * @param id 场次ID
     * @return 座位图信息
     */
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

        // Redis Bitmap 优先读取座位状态，缓存未命中时从 MySQL 重建并回写
        String[] seatStatuses = seatBitmapService.getSeatStatuses(id, schedule.getTotalSeats());
        if (seatStatuses == null) {
            // 缓存未命中，从 MySQL 重建并回写
            seatBitmapService.rebuildBitmap(id, scheduleSeats);
            // 重建后重读 Redis，确保返回最新状态
            seatStatuses = seatBitmapService.getSeatStatuses(id, schedule.getTotalSeats());
        }

        if (seatStatuses != null) {
            availableCount = 0;
            for (SeatVO seatVO : seats) {
                int idx = seatVO.getSeatIndex();
                if (idx >= 0 && idx < seatStatuses.length) {
                    String status = seatStatuses[idx];
                    if (status != null) {
                        seatVO.setStatus(status);
                    }
                }
                if (ScheduleSeatStatus.AVAILABLE.getCode().equals(seatVO.getStatus())) {
                    availableCount++;
                }
            }
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

    /**
     * 定时自动结束过期场次。
     * <p>
     * 每10分钟执行一次，查询放映日期已过或当天放映结束时间已到的在售场次，
     * 逐个置为已结束状态：释放锁定座位、取消关联未支付订单并通知用户、
     * 将已出票订单置为已过期、清理 Redis Bitmap 缓存。
     * 单条场次处理异常不影响其他场次。
     */
    @Scheduled(fixedRate = 600000)
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

                // 清理 Redis Bitmap 缓存（与 endSchedule 一致）
                seatBitmapService.deleteBitmap(schedule.getId());
            } catch (Exception e) {
                log.error("Error auto-ending schedule {}", schedule.getId(), e);
            }
        }

        if (!expired.isEmpty()) {
            log.info("Auto-ended {} expired schedules", expired.size());
        }
    }

    /**
     * 释放指定场次下所有锁定座位，恢复为可选状态。
     *
     * @param scheduleId 场次ID
     */
    private void releaseLockedSeats(Long scheduleId) {
        List<ScheduleSeat> lockedSeatsByScheduleId = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, scheduleId)
                        .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
        for (ScheduleSeat ss : lockedSeatsByScheduleId) {
            ss.setStatus(ScheduleSeatStatus.AVAILABLE.getCode());
            ss.setLockedAt(null);
            ss.setOrderId(null);
            scheduleSeatMapper.updateById(ss);
        }
    }

    /**
     * 将指定场次下已出票(paid)订单置为已过期(expired)。
     * <p>
     * 场次结束后票据失效,不可再检票/退票。座位不释放(场次已结束,无需回收)。
     *
     * @param scheduleId 场次ID
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

    /**
     * 检查指定影厅在给定日期和时段是否存在排片冲突。
     * <p>
     * 查询同影厅、同日期、可售状态、时间段重叠的场次（排除指定ID），
     * 若存在冲突则抛出 BusinessException。
     *
     * @param hallId     影厅ID
     * @param showDate   放映日期
     * @param startTime  放映开始时间
     * @param endTime    放映结束时间
     * @param excludeId  排除的场次ID（编辑时传入当前场次ID，新增时传null）
     */
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

    /**
     * 座位计数（lockedCount=锁定，soldCount=已售，-1表示缓存未命中）
     */
    private record SeatCounts(long lockedCount, long soldCount) {}

    /**
     * 优先从 Redis Bitmap BITCOUNT 获取座位计数，缓存未命中时降级查 MySQL。
     *
     * @param scheduleId 场次ID（非座位ID）
     * @return 座位计数，包含锁定数和已售数
     */
    private SeatCounts getSeatCounts(Long scheduleId) {
        long lockedCount = seatBitmapService.getLockedCount(scheduleId);
        long soldCount = seatBitmapService.getSoldCount(scheduleId);
        if (lockedCount < 0 || soldCount < 0) {
            lockedCount = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getScheduleId, scheduleId)
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.LOCKED.getCode()));
            Long soldCountDb = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getScheduleId, scheduleId)
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
            soldCount = soldCountDb;
        }
        return new SeatCounts(lockedCount, soldCount);
    }

    /**
     * 判断更新参数是否修改了影厅、日期、开始时间、结束时间等核心字段。
     *
     * @param schedule 原始场次
     * @param dto      更新参数
     * @return true 表示核心字段有变更
     */
    private boolean isCoreFieldChanged(Schedule schedule, ScheduleUpdateDTO dto) {
        return (dto.getHallId() != null && !dto.getHallId().equals(schedule.getHallId())) ||
                (dto.getShowDate() != null && !dto.getShowDate().equals(schedule.getShowDate())) ||
                (dto.getStartTime() != null && !dto.getStartTime().equals(schedule.getStartTime())) ||
                (dto.getEndTime() != null && !dto.getEndTime().equals(schedule.getEndTime()));
    }

    /**
     * 将场次实体转换为列表展示对象。
     * <p>
     * 填充影片名、影院名、影厅名，并通过 Redis Bitmap 或 MySQL 获取座位统计
     * （锁定数、已售数、可选数、上座率）。
     *
     * @param schedule 场次实体
     * @return 场次列表展示对象
     */
    private ScheduleListVO toListVO(Schedule schedule) {
        ScheduleListVO vo = new ScheduleListVO();
        BeanUtils.copyProperties(schedule, vo);

        Movie movie = movieMapper.selectById(schedule.getMovieId());
        if (movie != null) vo.setMovieName(movie.getName());

        Cinema cinema = cinemaMapper.selectById(schedule.getCinemaId());
        if (cinema != null) vo.setCinemaName(cinema.getName());

        Hall hall = hallMapper.selectById(schedule.getHallId());
        if (hall != null) vo.setHallName(hall.getName());

        // 优先从 Redis Bitmap BITCOUNT 获取，缓存未命中时降级查 MySQL
        SeatCounts counts = getSeatCounts(schedule.getId());

        vo.setAvailableSeats(schedule.getTotalSeats() - (int) counts.lockedCount() - (int) counts.soldCount());
        vo.setSoldSeats((int) counts.soldCount());
        if (schedule.getTotalSeats() > 0) {
            vo.setOccupancyRate((double) counts.soldCount() / schedule.getTotalSeats());
        }

        return vo;
    }

    /**
     * 将场次实体转换为详情展示对象。
     * <p>
     * 填充影片名称/海报/时长、影院名称/地址、影厅名称/屏幕类型，
     * 并通过 Redis Bitmap 或 MySQL 获取座位统计（锁定数、已售数、可选数、上座率）。
     *
     * @param schedule 场次实体
     * @return 场次详情展示对象
     */
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

        // 优先从 Redis Bitmap BITCOUNT 获取，缓存未命中时降级查 MySQL
        SeatCounts counts = getSeatCounts(schedule.getId());

        vo.setLockedSeats((int) counts.lockedCount());
        vo.setSoldSeats((int) counts.soldCount());
        vo.setAvailableSeats(schedule.getTotalSeats() - (int) counts.lockedCount() - (int) counts.soldCount());
        if (schedule.getTotalSeats() > 0) {
            vo.setOccupancyRate((double) counts.soldCount() / schedule.getTotalSeats());
        }

        return vo;
    }
}
