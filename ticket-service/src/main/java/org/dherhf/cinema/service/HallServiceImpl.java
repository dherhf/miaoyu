package org.dherhf.cinema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.util.PageUtil;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.cinema.enums.CinemaStatus;
import org.dherhf.cinema.enums.HallStatus;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.schedule.enums.ScheduleSeatStatus;
import org.dherhf.schedule.enums.ScheduleStatus;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.cinema.dto.CellDTO;
import org.dherhf.cinema.dto.HallCreateDTO;
import org.dherhf.cinema.dto.HallLayoutDTO;
import org.dherhf.cinema.dto.HallUpdateDTO;
import org.dherhf.cinema.vo.CellItemVO;
import org.dherhf.cinema.vo.HallDetailVO;
import org.dherhf.cinema.vo.HallListVO;
import org.dherhf.cinema.vo.HallVO;
import org.dherhf.cinema.vo.LayoutResultVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HallServiceImpl implements HallService {

    private final HallMapper hallMapper;
    private final HallCellMapper hallCellMapper;
    private final CinemaMapper cinemaMapper;
    private final ScheduleMapper scheduleMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;

    @Override
    public HallVO createHall(HallCreateDTO dto) {
        Cinema cinema = cinemaMapper.selectById(dto.getCinemaId());
        if (cinema == null) {
            throw new BusinessException(404, "影院不存在");
        }
        if (cinema.getStatus() != CinemaStatus.OPEN.getCode()) {
            throw new BusinessException(400, "影院已禁用");
        }

        Long existCount = hallMapper.selectCount(
                new LambdaQueryWrapper<Hall>()
                        .eq(Hall::getCinemaId, dto.getCinemaId())
                        .eq(Hall::getName, dto.getName()));
        if (existCount > 0) {
            throw new BusinessException(409, "影厅名称已存在");
        }

        Hall hall = new Hall();
        BeanUtils.copyProperties(dto, hall);
        hall.setStatus(HallStatus.ACTIVE.getCode());
        hall.setTotalRows(0);
        hall.setTotalCols(0);
        hallMapper.insert(hall);

        return toVO(hall);
    }

    @Override
    public PageResult<HallListVO> list(Long cinemaId, String name, String screenType, Integer status, Integer page, Integer size) {
        Page<Hall> pageParam = new Page<>(PageUtil.normalizePage(page), PageUtil.normalizeSize(size));
        LambdaQueryWrapper<Hall> wrapper = new LambdaQueryWrapper<Hall>()
                .eq(cinemaId != null, Hall::getCinemaId, cinemaId)
                .and(name != null && !name.isBlank(), w -> w.like(Hall::getName, name))
                .eq(screenType != null && !screenType.isBlank(), Hall::getScreenType, screenType)
                .eq(status != null, Hall::getStatus, status)
                .orderByDesc(Hall::getCreatedAt);

        IPage<Hall> result = hallMapper.selectPage(pageParam, wrapper);
        List<HallListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    public HallDetailVO detail(Long id) {
        Hall hall = hallMapper.selectById(id);
        if (hall == null) {
            throw new BusinessException(404, "影厅不存在");
        }

        List<HallCell> cells = hallCellMapper.selectList(
                new LambdaQueryWrapper<HallCell>()
                        .eq(HallCell::getHallId, id)
                        .orderByAsc(HallCell::getRowIndex)
                        .orderByAsc(HallCell::getColIndex));

        HallDetailVO vo = new HallDetailVO();
        BeanUtils.copyProperties(hall, vo);
        vo.setCells(cells.stream().map(this::toCellItemVO).collect(Collectors.toList()));

        return vo;
    }

    @Override
    public HallVO updateHall(Long id, HallUpdateDTO dto) {
        Hall hall = hallMapper.selectById(id);
        if (hall == null) {
            throw new BusinessException(404, "影厅不存在");
        }

        if (dto.getName() != null && !dto.getName().equals(hall.getName())) {
            Long existCount = hallMapper.selectCount(
                    new LambdaQueryWrapper<Hall>()
                            .eq(Hall::getCinemaId, hall.getCinemaId())
                            .eq(Hall::getName, dto.getName())
                            .ne(Hall::getId, id));
            if (existCount > 0) {
                throw new BusinessException(409, "影厅名称已存在");
            }
            hall.setName(dto.getName());
        }

        if (dto.getScreenType() != null) {
            hall.setScreenType(dto.getScreenType());
        }
        if (dto.getStatus() != null) {
            hall.setStatus(dto.getStatus());
        }

        hallMapper.updateById(hall);

        Hall updated = hallMapper.selectById(id);
        return toVO(updated);
    }

    @Override
    @Transactional
    public LayoutResultVO saveLayout(Long id, HallLayoutDTO dto) {
        Hall hall = hallMapper.selectById(id);
        if (hall == null) {
            throw new BusinessException(404, "影厅不存在");
        }

        if (dto.getCells().size() != dto.getTotalRows() * dto.getTotalCols()) {
            throw new BusinessException(400, "座位布局与行列数不匹配");
        }

        Set<String> seatLabels = new HashSet<>();
        for (CellDTO cell : dto.getCells()) {
            if ("seat".equals(cell.getCellType())) {
                if (cell.getSeatLabel() != null && !cell.getSeatLabel().isBlank()) {
                    if (!seatLabels.add(cell.getSeatLabel())) {
                        throw new BusinessException(409, "座位标签重复: " + cell.getSeatLabel());
                    }
                }
            }
        }

        // 检查影厅是否已有未来排片且存在已售出座位，若有则拒绝修改布局
        List<Schedule> futureSchedules = scheduleMapper.selectList(
                new LambdaQueryWrapper<Schedule>()
                        .eq(Schedule::getHallId, id)
                        .eq(Schedule::getStatus, ScheduleStatus.ON_SALE.getCode())
                        .ge(Schedule::getShowDate, LocalDate.now()));
        for (Schedule sch : futureSchedules) {
            Long soldCount = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .eq(ScheduleSeat::getScheduleId, sch.getId())
                            .eq(ScheduleSeat::getStatus, ScheduleSeatStatus.SOLD.getCode()));
            if (soldCount > 0) {
                throw new BusinessException(409, "影厅已有未来排片且存在已售座位，不可修改布局。排片ID=" + sch.getId() + "，已售座位数=" + soldCount);
            }
        }

        // 检查是否有非已售状态的 schedule_seats 引用了当前 hall_cells（这些记录会阻止删除）
        List<HallCell> existingCells = hallCellMapper.selectList(
                new LambdaQueryWrapper<HallCell>().eq(HallCell::getHallId, id));
        List<Long> existingCellIds = existingCells.stream().map(HallCell::getId).collect(Collectors.toList());
        if (!existingCellIds.isEmpty()) {
            Long referencedCount = scheduleSeatMapper.selectCount(
                    new LambdaQueryWrapper<ScheduleSeat>()
                            .in(ScheduleSeat::getHallCellId, existingCellIds));
            if (referencedCount > 0) {
                throw new BusinessException(409, "影厅座位已被排片引用，无法删除重建。引用记录数=" + referencedCount
                        + "，被引用的座位格数=" + existingCellIds.size()
                        + "，hallCellIds=" + existingCellIds);
            }
        }

        hallCellMapper.delete(
                new LambdaQueryWrapper<HallCell>().eq(HallCell::getHallId, id));

        for (CellDTO cellDTO : dto.getCells()) {
            HallCell cell = HallCell.builder()
                    .hallId(id)
                    .rowIndex(cellDTO.getRowIndex())
                    .colIndex(cellDTO.getColIndex())
                    .cellType(cellDTO.getCellType())
                    .seatLabel(cellDTO.getSeatLabel())
                    .seatCategory(cellDTO.getSeatCategory())
                    .build();
            hallCellMapper.insert(cell);
        }

        hall.setTotalRows(dto.getTotalRows());
        hall.setTotalCols(dto.getTotalCols());
        hallMapper.updateById(hall);

        Long totalSeats = hallCellMapper.selectCount(
                new LambdaQueryWrapper<HallCell>()
                        .eq(HallCell::getHallId, id)
                        .eq(HallCell::getCellType, "seat"));

        Hall updated = hallMapper.selectById(id);

        return LayoutResultVO.builder()
                .hallId(id)
                .totalSeats(totalSeats)
                .updatedAt(updated.getUpdatedAt())
                .build();
    }

    private HallVO toVO(Hall hall) {
        HallVO vo = new HallVO();
        BeanUtils.copyProperties(hall, vo);
        return vo;
    }

    private HallListVO toListVO(Hall hall) {
        HallListVO vo = new HallListVO();
        BeanUtils.copyProperties(hall, vo);

        Cinema cinema = cinemaMapper.selectById(hall.getCinemaId());
        if (cinema != null) {
            vo.setCinemaName(cinema.getName());
        }

        Long seatCount = hallCellMapper.selectCount(
                new LambdaQueryWrapper<HallCell>()
                        .eq(HallCell::getHallId, hall.getId())
                        .eq(HallCell::getCellType, "seat"));
        vo.setSeatCount(seatCount);

        return vo;
    }

    private CellItemVO toCellItemVO(HallCell cell) {
        CellItemVO vo = new CellItemVO();
        BeanUtils.copyProperties(cell, vo);
        return vo;
    }

    @Override
    @Transactional
    public void deleteHall(Long id) {
        Hall hall = hallMapper.selectById(id);
        if (hall == null) {
            throw new BusinessException(404, "影厅不存在");
        }

        // 检查是否有未结束/未取消的排片
        Long activeScheduleCount = scheduleMapper.selectCount(
                new LambdaQueryWrapper<Schedule>()
                        .eq(Schedule::getHallId, id)
                        .eq(Schedule::getStatus, ScheduleStatus.ON_SALE.getCode()));
        if (activeScheduleCount > 0) {
            throw new BusinessException(409, "该影厅有在售场次，无法删除");
        }

        // 删除座位格
        hallCellMapper.delete(
                new LambdaQueryWrapper<HallCell>().eq(HallCell::getHallId, id));

        // 删除影厅
        hallMapper.deleteById(id);
    }
}
