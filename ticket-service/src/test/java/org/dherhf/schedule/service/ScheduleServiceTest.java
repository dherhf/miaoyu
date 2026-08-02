package org.dherhf.schedule.service;

import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.schedule.dto.ScheduleCreateDTO;
import org.dherhf.movie.entity.Movie;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.schedule.service.ScheduleServiceImpl;
import org.dherhf.schedule.vo.ScheduleVO;
import org.dherhf.schedule.vo.SeatMapVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private ScheduleMapper scheduleMapper;
    @Mock
    private ScheduleSeatMapper scheduleSeatMapper;
    @Mock
    private MovieMapper movieMapper;
    @Mock
    private CinemaMapper cinemaMapper;
    @Mock
    private HallMapper hallMapper;
    @Mock
    private HallCellMapper hallCellMapper;

    @InjectMocks
    private ScheduleServiceImpl scheduleService;

    private ScheduleCreateDTO createDTO;

    @BeforeEach
    void setUp() {
        createDTO = new ScheduleCreateDTO();
        createDTO.setMovieId(1L);
        createDTO.setCinemaId(1L);
        createDTO.setHallId(1L);
        createDTO.setShowDate(LocalDate.of(2026, 8, 15));
        createDTO.setStartTime(LocalTime.of(14, 0));
        createDTO.setPrice(new BigDecimal("45.00"));
        createDTO.setLanguageVersion("国语");
    }

    @Test
    void createSchedule_success() {
        System.out.println("[ScheduleServiceTest] ▶ createSchedule_success");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(1);
        movie.setDuration(120);
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(1);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Hall hall = new Hall();
        hall.setId(1L);
        hall.setCinemaId(1L);
        hall.setStatus(1);
        when(hallMapper.selectById(1L)).thenReturn(hall);

        HallCell cell1 = new HallCell();
        cell1.setId(10L);
        cell1.setCellType("seat");
        HallCell cell2 = new HallCell();
        cell2.setId(11L);
        cell2.setCellType("seat");
        when(hallCellMapper.selectList(any())).thenReturn(List.of(cell1, cell2));

        when(scheduleMapper.selectList(any())).thenReturn(List.of());
        when(scheduleMapper.insert(any(Schedule.class))).thenReturn(1);
        when(scheduleSeatMapper.insert(any(ScheduleSeat.class))).thenReturn(1);

        ScheduleVO result = scheduleService.createSchedule(createDTO);

        assertEquals(2, result.getTotalSeats());
        assertEquals("onsale", result.getStatus());
        System.out.println("[ScheduleServiceTest] ✓ createSchedule_success PASSED");
    }

    @Test
    void createSchedule_movieNotPublished_throws400() {
        System.out.println("[ScheduleServiceTest] ▶ createSchedule_movieNotPublished_throws400");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(0);
        when(movieMapper.selectById(1L)).thenReturn(movie);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> scheduleService.createSchedule(createDTO));
        assertEquals(400, ex.getCode());
        System.out.println("[ScheduleServiceTest] ✓ createSchedule_movieNotPublished_throws400 PASSED");
    }

    @Test
    void createSchedule_pastDate_throws400() {
        System.out.println("[ScheduleServiceTest] ▶ createSchedule_pastDate_throws400");
        createDTO.setShowDate(LocalDate.of(2020, 1, 1));

        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(1);
        movie.setDuration(120);
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(1);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Hall hall = new Hall();
        hall.setId(1L);
        hall.setCinemaId(1L);
        hall.setStatus(1);
        when(hallMapper.selectById(1L)).thenReturn(hall);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> scheduleService.createSchedule(createDTO));
        assertEquals(400, ex.getCode());
        System.out.println("[ScheduleServiceTest] ✓ createSchedule_pastDate_throws400 PASSED");
    }

    @Test
    void cancelSchedule_notFound_throws404() {
        System.out.println("[ScheduleServiceTest] ▶ cancelSchedule_notFound_throws404");
        when(scheduleMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> scheduleService.cancelSchedule(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[ScheduleServiceTest] ✓ cancelSchedule_notFound_throws404 PASSED");
    }

    @Test
    void cancelSchedule_hasSoldSeats_throws409() {
        System.out.println("[ScheduleServiceTest] ▶ cancelSchedule_hasSoldSeats_throws409");
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setStatus("onsale");
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);
        when(scheduleSeatMapper.selectCount(any())).thenReturn(2L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> scheduleService.cancelSchedule(1L));
        assertEquals(409, ex.getCode());
        System.out.println("[ScheduleServiceTest] ✓ cancelSchedule_hasSoldSeats_throws409 PASSED");
    }

    @Test
    void endSchedule_alreadyEnded_noOp() {
        System.out.println("[ScheduleServiceTest] ▶ endSchedule_alreadyEnded_noOp");
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setStatus("ended");
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        scheduleService.endSchedule(1L);

        verify(scheduleMapper, never()).updateById(any(Schedule.class));
        System.out.println("[ScheduleServiceTest] ✓ endSchedule_alreadyEnded_noOp PASSED");
    }

    @Test
    void userDetail_notOnsale_throws404() {
        System.out.println("[ScheduleServiceTest] ▶ userDetail_notOnsale_throws404");
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setStatus("cancelled");
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> scheduleService.userDetail(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[ScheduleServiceTest] ✓ userDetail_notOnsale_throws404 PASSED");
    }

    @Test
    void getSeatMap_success() {
        System.out.println("[ScheduleServiceTest] ▶ getSeatMap_success");
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setHallId(1L);
        schedule.setStatus("onsale");
        schedule.setTotalSeats(2);
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        Hall hall = new Hall();
        hall.setId(1L);
        hall.setTotalRows(2);
        hall.setTotalCols(2);
        when(hallMapper.selectById(1L)).thenReturn(hall);

        ScheduleSeat ss1 = new ScheduleSeat();
        ss1.setSeatIndex(0);
        ss1.setHallCellId(10L);
        ss1.setStatus("available");
        ScheduleSeat ss2 = new ScheduleSeat();
        ss2.setSeatIndex(1);
        ss2.setHallCellId(11L);
        ss2.setStatus("sold");
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(ss1, ss2));

        HallCell hc1 = new HallCell();
        hc1.setId(10L);
        hc1.setRowIndex(1);
        hc1.setColIndex(1);
        hc1.setSeatLabel("A1");
        HallCell hc2 = new HallCell();
        hc2.setId(11L);
        hc2.setRowIndex(1);
        hc2.setColIndex(2);
        hc2.setSeatLabel("A2");
        when(hallCellMapper.selectList(any())).thenReturn(List.of(hc1, hc2));

        SeatMapVO result = scheduleService.getSeatMap(1L);

        assertEquals(2, result.getSeats().size());
        assertEquals(1, result.getAvailableSeats());
        System.out.println("[ScheduleServiceTest] ✓ getSeatMap_success PASSED");
    }
}
