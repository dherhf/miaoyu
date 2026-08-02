package org.dherhf.cinema.service;

import org.dherhf.cinema.service.HallServiceImpl;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.cinema.dto.HallCreateDTO;
import org.dherhf.cinema.dto.HallLayoutDTO;
import org.dherhf.cinema.dto.CellDTO;
import org.dherhf.cinema.vo.HallVO;
import org.dherhf.cinema.vo.LayoutResultVO;
import org.dherhf.common.result.Result;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HallServiceTest {

    @Mock
    private HallMapper hallMapper;
    @Mock
    private HallCellMapper hallCellMapper;
    @Mock
    private CinemaMapper cinemaMapper;
    @Mock
    private ScheduleMapper scheduleMapper;
    @Mock
    private ScheduleSeatMapper scheduleSeatMapper;

    @InjectMocks
    private HallServiceImpl hallService;

    private HallCreateDTO createDTO;

    @BeforeEach
    void setUp() {
        createDTO = new HallCreateDTO();
        createDTO.setCinemaId(1L);
        createDTO.setName("IMAX 1号厅");
        createDTO.setScreenType("IMAX");
    }

    @Test
    void createHall_success() {
        System.out.println("[HallServiceTest] ▶ createHall_success");
        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(1);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);
        when(hallMapper.selectCount(any())).thenReturn(0L);
        when(hallMapper.insert(any(Hall.class))).thenReturn(1);

        Result<HallVO> result = hallService.createHall(createDTO);

        assertEquals(0, result.getCode());
        assertEquals("IMAX 1号厅", result.getData().getName());
        assertEquals(1, result.getData().getStatus());
        System.out.println("[HallServiceTest] ✓ createHall_success PASSED");
    }

    @Test
    void createHall_cinemaNotFound_throws404() {
        System.out.println("[HallServiceTest] ▶ createHall_cinemaNotFound_throws404");
        when(cinemaMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> hallService.createHall(createDTO));
        assertEquals(404, ex.getCode());
        System.out.println("[HallServiceTest] ✓ createHall_cinemaNotFound_throws404 PASSED");
    }

    @Test
    void createHall_duplicateName_throws409() {
        System.out.println("[HallServiceTest] ▶ createHall_duplicateName_throws409");
        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(1);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);
        when(hallMapper.selectCount(any())).thenReturn(1L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> hallService.createHall(createDTO));
        assertEquals(409, ex.getCode());
        System.out.println("[HallServiceTest] ✓ createHall_duplicateName_throws409 PASSED");
    }

    @Test
    void saveLayout_success() {
        System.out.println("[HallServiceTest] ▶ saveLayout_success");
        Hall hall = new Hall();
        hall.setId(1L);
        hall.setTotalRows(0);
        hall.setTotalCols(0);
        hall.setUpdatedAt(LocalDateTime.now());
        when(hallMapper.selectById(1L)).thenReturn(hall);

        HallLayoutDTO dto = new HallLayoutDTO();
        dto.setTotalRows(2);
        dto.setTotalCols(2);
        CellDTO cell1 = new CellDTO();
        cell1.setRowIndex(1);
        cell1.setColIndex(1);
        cell1.setCellType("seat");
        cell1.setSeatLabel("A1");
        CellDTO cell2 = new CellDTO();
        cell2.setRowIndex(1);
        cell2.setColIndex(2);
        cell2.setCellType("void");
        CellDTO cell3 = new CellDTO();
        cell3.setRowIndex(2);
        cell3.setColIndex(1);
        cell3.setCellType("seat");
        cell3.setSeatLabel("B1");
        CellDTO cell4 = new CellDTO();
        cell4.setRowIndex(2);
        cell4.setColIndex(2);
        cell4.setCellType("seat");
        cell4.setSeatLabel("B2");
        dto.setCells(List.of(cell1, cell2, cell3, cell4));

        when(scheduleMapper.selectList(any())).thenReturn(List.of());
        when(hallCellMapper.delete(any())).thenReturn(0);
        when(hallCellMapper.insert(any(HallCell.class))).thenReturn(1);
        when(hallMapper.updateById(any(Hall.class))).thenReturn(1);
        when(hallCellMapper.selectCount(any())).thenReturn(3L);

        Result<LayoutResultVO> result = hallService.saveLayout(1L, dto);

        assertEquals(0, result.getCode());
        assertEquals(3L, result.getData().getTotalSeats());
        System.out.println("[HallServiceTest] ✓ saveLayout_success PASSED");
    }

    @Test
    void saveLayout_cellCountMismatch_throws400() {
        System.out.println("[HallServiceTest] ▶ saveLayout_cellCountMismatch_throws400");
        Hall hall = new Hall();
        hall.setId(1L);
        when(hallMapper.selectById(1L)).thenReturn(hall);

        HallLayoutDTO dto = new HallLayoutDTO();
        dto.setTotalRows(2);
        dto.setTotalCols(2);
        dto.setCells(List.of(new CellDTO()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> hallService.saveLayout(1L, dto));
        assertEquals(400, ex.getCode());
        System.out.println("[HallServiceTest] ✓ saveLayout_cellCountMismatch_throws400 PASSED");
    }

    @Test
    void saveLayout_hallNotFound_throws404() {
        System.out.println("[HallServiceTest] ▶ saveLayout_hallNotFound_throws404");
        when(hallMapper.selectById(1L)).thenReturn(null);

        HallLayoutDTO dto = new HallLayoutDTO();
        dto.setTotalRows(1);
        dto.setTotalCols(1);
        dto.setCells(List.of(new CellDTO()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> hallService.saveLayout(1L, dto));
        assertEquals(404, ex.getCode());
        System.out.println("[HallServiceTest] ✓ saveLayout_hallNotFound_throws404 PASSED");
    }
}
