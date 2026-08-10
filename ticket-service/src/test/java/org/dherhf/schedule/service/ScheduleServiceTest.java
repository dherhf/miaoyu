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
import static org.mockito.ArgumentMatchers.eq;
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
    @Mock
    private org.dherhf.notification.service.NotificationService notificationService;
    @Mock
    private org.dherhf.order.mapper.OrderMapper orderMapper;
    @Mock
    private SeatBitmapService seatBitmapService;

    @InjectMocks
    private ScheduleServiceImpl scheduleService;

    private ScheduleCreateDTO createDTO;

    @BeforeEach
    void setUp() {
        createDTO = ScheduleCreateDTO.builder().movieId(1L).cinemaId(1L).hallId(1L).showDate(LocalDate.of(2026, 8, 15)).startTime(LocalTime.of(14, 0)).price(new BigDecimal("45.00")).languageVersion("国语").build();
    }

    @Test
    void createSchedule_success() {
        System.out.println("[ScheduleServiceTest] ▶ createSchedule_success");
        Movie movie = Movie.builder().id(1L).status(1).duration(120).build();
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Cinema cinema = Cinema.builder().id(1L).status(1).build();
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Hall hall = Hall.builder().id(1L).cinemaId(1L).status(1).build();
        when(hallMapper.selectById(1L)).thenReturn(hall);

        HallCell cell1 = HallCell.builder().id(10L).cellType("seat").build();
        HallCell cell2 = HallCell.builder().id(11L).cellType("seat").build();
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
        Movie movie = Movie.builder().id(1L).status(0).build();
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

        Movie movie = Movie.builder().id(1L).status(1).duration(120).build();
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Cinema cinema = Cinema.builder().id(1L).status(1).build();
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Hall hall = Hall.builder().id(1L).cinemaId(1L).status(1).build();
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
        Schedule schedule = Schedule.builder().id(1L).status("onsale").build();
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
        Schedule schedule = Schedule.builder().id(1L).status("ended").build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        scheduleService.endSchedule(1L);

        verify(scheduleMapper, never()).updateById(any(Schedule.class));
        System.out.println("[ScheduleServiceTest] ✓ endSchedule_alreadyEnded_noOp PASSED");
    }

    @Test
    void userDetail_notOnsale_throws404() {
        System.out.println("[ScheduleServiceTest] ▶ userDetail_notOnsale_throws404");
        Schedule schedule = Schedule.builder().id(1L).status("cancelled").build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> scheduleService.userDetail(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[ScheduleServiceTest] ✓ userDetail_notOnsale_throws404 PASSED");
    }

    @Test
    void getSeatMap_success() {
        System.out.println("[ScheduleServiceTest] ▶ getSeatMap_success");
        Schedule schedule = Schedule.builder().id(1L).hallId(1L).status("onsale").totalSeats(2).build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        Hall hall = Hall.builder().id(1L).totalRows(2).totalCols(2).build();
        when(hallMapper.selectById(1L)).thenReturn(hall);

        ScheduleSeat ss1 = ScheduleSeat.builder().seatIndex(0).hallCellId(10L).status("available").build();
        ScheduleSeat ss2 = ScheduleSeat.builder().seatIndex(1).hallCellId(11L).status("sold").build();
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(ss1, ss2));

        HallCell hc1 = HallCell.builder().id(10L).rowIndex(1).colIndex(1).seatLabel("A1").build();
        HallCell hc2 = HallCell.builder().id(11L).rowIndex(1).colIndex(2).seatLabel("A2").build();
        when(hallCellMapper.selectList(any())).thenReturn(List.of(hc1, hc2));

        SeatMapVO result = scheduleService.getSeatMap(1L);

        assertEquals(2, result.getSeats().size());
        assertEquals(1, result.getAvailableSeats());
        System.out.println("[ScheduleServiceTest] ✓ getSeatMap_success PASSED");
    }

    @Test
    void autoEndExpiredSchedules_expiresPaidOrders() {
        System.out.println("[ScheduleServiceTest] ▶ autoEndExpiredSchedules_expiresPaidOrders");
        Schedule schedule = Schedule.builder().id(1L).status("onsale")
                .showDate(LocalDate.now().minusDays(1)).endTime(LocalTime.of(14, 0)).build();
        when(scheduleMapper.selectList(any())).thenReturn(List.of(schedule));
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of());

        org.dherhf.order.entity.Order paidOrder = org.dherhf.order.entity.Order.builder()
                .id(10L).userId(100L).status("paid").movieName("流浪地球3").build();
        // 第一次 selectList 返回空(无待支付订单),第二次返回已出票订单
        when(orderMapper.selectList(any())).thenReturn(List.of()).thenReturn(List.of(paidOrder));
        when(orderMapper.updateToExpiredIfPaid(10L)).thenReturn(1);

        scheduleService.autoEndExpiredSchedules();

        assertEquals("ended", schedule.getStatus());
        verify(orderMapper).updateToExpiredIfPaid(10L);
        verify(notificationService).sendNotification(eq(100L), eq("EXPIRED"), any(), any(), eq(10L));
        System.out.println("[ScheduleServiceTest] ✓ autoEndExpiredSchedules_expiresPaidOrders PASSED");
    }
}
