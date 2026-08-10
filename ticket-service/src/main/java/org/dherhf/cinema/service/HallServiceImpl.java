package org.dherhf.cinema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
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

/**
 * 影厅服务实现类,实现 {@link HallService} 接口。
 * <p>
 * 提供影厅的增删改查业务逻辑,包括影厅名称唯一性校验、座位布局管理
 * （保存布局时校验座位标签唯一性、检查排片冲突）等功能。
 */
@Service
@RequiredArgsConstructor
public class HallServiceImpl implements HallService {

    private final HallMapper hallMapper;
    private final HallCellMapper hallCellMapper;
    private final CinemaMapper cinemaMapper;
    private final ScheduleMapper scheduleMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;

        /**
     * 新增影厅。
     * <p>
     * 先校验所属影院存在且处于营业状态,再校验同影院下影厅名称唯一性,
     * 然后创建影厅实体并设置初始状态为启用,写入数据库。
     *
     * @param dto 影厅创建请求,包含所属影院 ID、名称、银幕类型等信息
     * @return 新创建的影厅信息
     * @throws BusinessException 影院不存在时抛出 404,影院已禁用时抛出 400,影厅名称已存在时抛出 409
     */
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

        /**
     * 分页查询影厅列表,支持按影院、名称、银幕类型、状态筛选。
     *
     * @param cinemaId   影院 ID（可选）
     * @param name       影厅名称,模糊匹配（可选）
     * @param screenType 银幕类型（可选）
     * @param status     影厅状态（可选）
     * @param page       页码
     * @param size       每页条数
     * @return 分页影厅列表,每条记录包含影院名称和座位数
     */
    @Override
    public PageResult<HallListVO> list(Long cinemaId, String name, String screenType, Integer status, Integer page, Integer size) {
        Page<Hall> pageParam = new Page<>(page, size);
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

        /**
     * 查询影厅详情,包含座位布局信息。
     * <p>
     * 查询影厅基本信息及关联的座位格子列表,按行号、列号升序排列。
     *
     * @param id 影厅 ID
     * @return 影厅详细信息,包含座位格子列表
     * @throws BusinessException 影厅不存在时抛出 404
     */
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

    /**
     * 更新影厅基本信息（名称、银幕类型、状态）。
     * <p>
     * 若名称变更,先在同影院范围内校验名称唯一性。
     *
     * @param id  影厅 ID
     * @param dto 影厅更新请求
     * @return 更新后的影厅信息
     * @throws BusinessException 影厅不存在时抛出 404,名称已存在时抛出 409
     */
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

    /**
     * 保存影厅座位布局。
     * <p>
     * 校验过程包括：座位格子数量与行列数匹配、座位标签唯一性、
     * 影厅是否已有未来排片且存在已售座位（有则拒绝修改）、
     * 以及是否被尚未结束的排片座位引用。
     * 校验通过后删除原座位格子并重新插入新的布局,更新影厅行列数,
     * 返回总座位数。该方法在事务中执行。
     *
     * @param id  影厅 ID
     * @param dto 座位布局请求,包含总行数、总列数和座位格子列表
     * @return 布局保存结果,包含总座位数和更新时间
     * @throws BusinessException 影厅不存在时抛出 404,布局校验失败/排片冲突时抛出 400 或 409
     */
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

    /**
     * 将影厅实体转换为影厅视图对象。
     *
     * @param hall 影厅实体
     * @return 影厅视图对象
     */
    private HallVO toVO(Hall hall) {
        HallVO vo = new HallVO();
        BeanUtils.copyProperties(hall, vo);
        return vo;
    }

    /**
     * 将影厅实体转换为列表视图对象,附带影院名称和座位数。
     *
     * @param hall 影厅实体
     * @return 影厅列表视图对象
     */
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

    /**
     * 将座位格子实体转换为座位格子视图对象。
     *
     * @param cell 座位格子实体
     * @return 座位格子视图对象
     */
    private CellItemVO toCellItemVO(HallCell cell) {
        CellItemVO vo = new CellItemVO();
        BeanUtils.copyProperties(cell, vo);
        return vo;
    }

    /**
     * 删除影厅。
     * <p>
     * 先校验影厅是否存在及是否有在售场次（有则拒绝删除）,
     * 然后删除该影厅的座位格子数据,最后删除影厅。该方法在事务中执行。
     *
     * @param id 影厅 ID
     * @throws BusinessException 影厅不存在时抛出 404,存在在售场次时抛出 409
     */
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
