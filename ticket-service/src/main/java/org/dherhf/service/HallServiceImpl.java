package org.dherhf.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.BusinessException;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.entity.Cinema;
import org.dherhf.entity.Hall;
import org.dherhf.entity.HallCell;
import org.dherhf.mapper.CinemaMapper;
import org.dherhf.mapper.HallCellMapper;
import org.dherhf.mapper.HallMapper;
import org.dherhf.dto.CellDTO;
import org.dherhf.dto.HallCreateDTO;
import org.dherhf.dto.HallLayoutDTO;
import org.dherhf.dto.HallUpdateDTO;
import org.dherhf.vo.CellItemVO;
import org.dherhf.vo.HallDetailVO;
import org.dherhf.vo.HallListVO;
import org.dherhf.vo.HallVO;
import org.dherhf.vo.LayoutResultVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Override
    public Result<HallVO> createHall(HallCreateDTO dto) {
        Cinema cinema = cinemaMapper.selectById(dto.getCinemaId());
        if (cinema == null) {
            throw new BusinessException(404, "影院不存在");
        }
        if (cinema.getStatus() != 1) {
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
        hall.setStatus(1);
        hall.setTotalRows(0);
        hall.setTotalCols(0);
        hallMapper.insert(hall);

        return Result.success(toVO(hall));
    }

    @Override
    public Result<PageResult<HallListVO>> list(Long cinemaId, String name, String screenType, Integer status, Integer page, Integer size) {
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

        return Result.success(new PageResult<>(result.getTotal(), page, size, records));
    }

    @Override
    public Result<HallDetailVO> detail(Long id) {
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

        return Result.success(vo);
    }

    @Override
    public Result<HallVO> updateHall(Long id, HallUpdateDTO dto) {
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
        return Result.success(toVO(updated));
    }

    @Override
    @Transactional
    public Result<LayoutResultVO> saveLayout(Long id, HallLayoutDTO dto) {
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

        // TODO: 检查影厅是否已有未来排片且存在已售出订单（若有则拒绝修改布局）

        hallCellMapper.delete(
                new LambdaQueryWrapper<HallCell>().eq(HallCell::getHallId, id));

        for (CellDTO cellDTO : dto.getCells()) {
            HallCell cell = new HallCell();
            cell.setHallId(id);
            cell.setRowIndex(cellDTO.getRowIndex());
            cell.setColIndex(cellDTO.getColIndex());
            cell.setCellType(cellDTO.getCellType());
            cell.setSeatLabel(cellDTO.getSeatLabel());
            cell.setSeatCategory(cellDTO.getSeatCategory());
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

        LayoutResultVO result = new LayoutResultVO();
        result.setHallId(id);
        result.setTotalSeats(totalSeats);
        result.setUpdatedAt(updated.getUpdatedAt());

        return Result.success(result);
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
}
