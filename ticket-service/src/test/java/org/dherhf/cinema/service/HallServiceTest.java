package org.dherhf.cinema.service;

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
        createDTO = HallCreateDTO.builder()
                .cinemaId(1L)
                .name("IMAX 1号厅")
                .screenType("IMAX")
                .build();
    }

    @Test
    void createHall_success() {
        System.out.println("[HallServiceTest] ▶ createHall_success");
        Cinema cinema = Cinema.builder().id(1L).status(1).build();
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);
        when(hallMapper.selectCount(any())).thenReturn(0L);
        when(hallMapper.insert(any(Hall.class))).thenReturn(1);

        HallVO result = hallService.createHall(createDTO);

        assertEquals("IMAX 1号厅", result.getName());
        assertEquals(1, result.getStatus());
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
        Cinema cinema = Cinema.builder().id(1L).status(1).build();
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
        Hall hall = Hall.builder()
                .id(1L)
                .totalRows(0)
                .totalCols(0)
                .updatedAt(LocalDateTime.now())
                .build();
        when(hallMapper.selectById(1L)).thenReturn(hall);

        CellDTO cell1 = CellDTO.builder()
                .rowIndex(1)
                .colIndex(1)
                .cellType("seat")
                .seatLabel("A1")
                .build();
        CellDTO cell2 = CellDTO.builder()
                .rowIndex(1)
                .colIndex(2)
                .cellType("void")
                .build();
        CellDTO cell3 = CellDTO.builder()
                .rowIndex(2)
                .colIndex(1)
                .cellType("seat")
                .seatLabel("B1")
                .build();
        CellDTO cell4 = CellDTO.builder()
                .rowIndex(2)
                .colIndex(2)
                .cellType("seat")
                .seatLabel("B2")
                .build();
        HallLayoutDTO dto = HallLayoutDTO.builder()
                .totalRows(2)
                .totalCols(2)
                .cells(List.of(cell1, cell2, cell3, cell4))
                .build();

        when(scheduleMapper.selectList(any())).thenReturn(List.of());
        when(hallCellMapper.delete(any())).thenReturn(0);
        when(hallCellMapper.insert(any(HallCell.class))).thenReturn(1);
        when(hallMapper.updateById(any(Hall.class))).thenReturn(1);
        when(hallCellMapper.selectCount(any())).thenReturn(3L);

        LayoutResultVO result = hallService.saveLayout(1L, dto);

        assertEquals(3L, result.getTotalSeats());
        System.out.println("[HallServiceTest] ✓ saveLayout_success PASSED");
    }

    @Test
    void saveLayout_cellCountMismatch_throws400() {
        System.out.println("[HallServiceTest] ▶ saveLayout_cellCountMismatch_throws400");
        Hall hall = Hall.builder().id(1L).build();
        when(hallMapper.selectById(1L)).thenReturn(hall);

        HallLayoutDTO dto = HallLayoutDTO.builder()
                .totalRows(2)
                .totalCols(2)
                .cells(List.of(new CellDTO()))
                .build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> hallService.saveLayout(1L, dto));
        assertEquals(400, ex.getCode());
        System.out.println("[HallServiceTest] ✓ saveLayout_cellCountMismatch_throws400 PASSED");
    }

    @Test
    void saveLayout_hallNotFound_throws404() {
        System.out.println("[HallServiceTest] ▶ saveLayout_hallNotFound_throws404");
        when(hallMapper.selectById(1L)).thenReturn(null);

        HallLayoutDTO dto = HallLayoutDTO.builder()
                .totalRows(1)
                .totalCols(1)
                .cells(List.of(new CellDTO()))
                .build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> hallService.saveLayout(1L, dto));
        assertEquals(404, ex.getCode());
        System.out.println("[HallServiceTest] ✓ saveLayout_hallNotFound_throws404 PASSED");
    }
}
