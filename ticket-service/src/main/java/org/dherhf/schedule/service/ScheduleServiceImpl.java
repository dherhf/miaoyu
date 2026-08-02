package org.dherhf.schedule.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.cinema.vo.SeatVO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.schedule.dto.ScheduleCreateDTO;
import org.dherhf.schedule.dto.ScheduleUpdateDTO;
import org.dherhf.movie.entity.Movie;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.ScheduleVO;
import org.dherhf.schedule.vo.SeatMapVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleMapper scheduleMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;
    private final MovieMapper movieMapper;
    private final CinemaMapper cinemaMapper;
    private final HallMapper hallMapper;
    private final HallCellMapper hallCellMapper;

    @Override
    @Transactional
    public ScheduleVO createSchedule(ScheduleCreateDTO dto) {
        Movie movie = movieMapper.selectById(dto.getMovieId());
        if (movie == null || movie.getStatus() != 1) {
            throw new BusinessException(400, "影片不存在或未上架");
        }

        Cinema cinema = cinemaMapper.selectById(dto.getCinemaId());
        if (cinema == null || cinema.getStatus() != 1) {
            throw new BusinessException(400, "影院不存在或已停业");
        }

        Hall hall = hallMapper.selectById(dto.getHallId());
        if (hall == null || hall.getStatus() != 1 || !hall.getCinemaId().equals(dto.getCinemaId())) {
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
        schedule.setStatus("onsale");
        scheduleMapper.insert(schedule);

        // 批量生成场次座位
        int seatIndex = 0;
        for (HallCell cell : seatCells) {
            ScheduleSeat ss = new ScheduleSeat();
            ss.setScheduleId(schedule.getId());
            ss.setHallCellId(cell.getId());
            ss.setSeatIndex(seatIndex++);
            ss.setStatus("available");
            scheduleSeatMapper.insert(ss);
        }

        // TODO: 初始化 Redis Bitmap (schedule:seat:occupied:{scheduleId}, schedule:seat:sold:{scheduleId})

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
        if (!"onsale".equals(schedule.getStatus())) {
            throw new BusinessException(409, "仅可售场次可修改");
        }

        // 检查是否有已售座位
        Long soldCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, "sold"));

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
                ScheduleSeat ss = new ScheduleSeat();
                ss.setScheduleId(id);
                ss.setHallCellId(cell.getId());
                ss.setSeatIndex(seatIndex++);
                ss.setStatus("available");
                scheduleSeatMapper.insert(ss);
            }

            // TODO: 重建 Redis Bitmap
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
        if (!"onsale".equals(schedule.getStatus())) {
            throw new BusinessException(409, "仅可取消在售场次");
        }

        Long soldCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, "sold"));
        if (soldCount > 0) {
            throw new BusinessException(409, "已有售票，不可取消");
        }

        schedule.setStatus("cancelled");
        scheduleMapper.updateById(schedule);

        // 释放所有锁定座位
        List<ScheduleSeat> lockedSeats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, "locked"));
        for (ScheduleSeat ss : lockedSeats) {
            ss.setStatus("available");
            ss.setLockedAt(null);
            ss.setOrderId(null);
            scheduleSeatMapper.updateById(ss);
        }

        // TODO: 通知取消关联的未支付订单（异步/事件）
        // TODO: 删除 Redis Bitmap 缓存
    }

    @Override
    @Transactional
    public void endSchedule(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException(404, "场次不存在");
        }
        if ("ended".equals(schedule.getStatus())) {
            return;
        }
        if (!"onsale".equals(schedule.getStatus())) {
            throw new BusinessException(409, "仅可结束在售场次");
        }

        schedule.setStatus("ended");
        scheduleMapper.updateById(schedule);

        // 释放锁定座位
        List<ScheduleSeat> lockedSeats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, id)
                        .eq(ScheduleSeat::getStatus, "locked"));
        for (ScheduleSeat ss : lockedSeats) {
            ss.setStatus("available");
            ss.setLockedAt(null);
            ss.setOrderId(null);
            scheduleSeatMapper.updateById(ss);
        }

        // TODO: 删除 Redis Bitmap 缓存
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
    public PageResult<ScheduleListVO> userList(String movieName, Long cinemaId, String showDate, Integer page, Integer size) {
        Page<Schedule> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Schedule> wrapper = new LambdaQueryWrapper<Schedule>()
                .eq(Schedule::getStatus, "onsale")
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
        if (schedule == null || !"onsale".equals(schedule.getStatus())) {
            throw new BusinessException(404, "场次不存在");
        }
        return toDetailVO(schedule);
    }

    @Override
    public SeatMapVO getSeatMap(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null || !"onsale".equals(schedule.getStatus())) {
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
            SeatVO seatVO = new SeatVO();
            seatVO.setSeatIndex(ss.getSeatIndex());
            seatVO.setStatus(ss.getStatus());
            for (HallCell hc : hallCells) {
                if (hc.getId().equals(ss.getHallCellId())) {
                    seatVO.setRowIndex(hc.getRowIndex());
                    seatVO.setColIndex(hc.getColIndex());
                    seatVO.setSeatLabel(hc.getSeatLabel());
                    seatVO.setSeatCategory(hc.getSeatCategory());
                    break;
                }
            }
            if ("available".equals(ss.getStatus())) {
                availableCount++;
            }
            seats.add(seatVO);
        }

        SeatMapVO vo = new SeatMapVO();
        vo.setScheduleId(id);
        vo.setHallId(schedule.getHallId());
        vo.setTotalRows(hall != null ? hall.getTotalRows() : 0);
        vo.setTotalCols(hall != null ? hall.getTotalCols() : 0);
        vo.setTotalSeats(schedule.getTotalSeats());
        vo.setAvailableSeats(availableCount);
        vo.setSeats(seats);

        // TODO: 座位状态优先从 Redis Bitmap 获取，缓存未命中时从 MySQL 重建并回写

        return vo;
    }

    private void checkConflict(Long hallId, LocalDate showDate, LocalTime startTime, LocalTime endTime, Long excludeId) {
        List<Schedule> conflicts = scheduleMapper.selectList(
                new LambdaQueryWrapper<Schedule>()
                        .eq(Schedule::getHallId, hallId)
                        .eq(Schedule::getShowDate, showDate)
                        .eq(Schedule::getStatus, "onsale")
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

        // 统计座位
        // TODO: 优先从 Redis Bitmap BITCOUNT 获取
        Long lockedCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, schedule.getId())
                        .eq(ScheduleSeat::getStatus, "locked"));
        Long soldCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, schedule.getId())
                        .eq(ScheduleSeat::getStatus, "sold"));

        int occupied = lockedCount.intValue() + soldCount.intValue();
        vo.setAvailableSeats(schedule.getTotalSeats() - occupied);
        vo.setSoldSeats(soldCount.intValue());
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

        // TODO: 优先从 Redis Bitmap 获取
        Long lockedCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, schedule.getId())
                        .eq(ScheduleSeat::getStatus, "locked"));
        Long soldCount = scheduleSeatMapper.selectCount(
                new LambdaQueryWrapper<ScheduleSeat>()
                        .eq(ScheduleSeat::getScheduleId, schedule.getId())
                        .eq(ScheduleSeat::getStatus, "sold"));

        vo.setLockedSeats(lockedCount.intValue());
        vo.setSoldSeats(soldCount.intValue());
        vo.setAvailableSeats(schedule.getTotalSeats() - lockedCount.intValue() - soldCount.intValue());
        if (schedule.getTotalSeats() > 0) {
            vo.setOccupancyRate((double) soldCount / schedule.getTotalSeats());
        }

        return vo;
    }
}
