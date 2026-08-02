package org.dherhf.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.dherhf.common.BusinessException;
import org.dherhf.entity.*;
import org.dherhf.mapper.*;
import org.dherhf.dto.LockSeatDTO;
import org.dherhf.vo.LockSeatResultVO;
import org.dherhf.vo.OrderDetailVO;
import org.dherhf.vo.PayResultVO;
import org.dherhf.vo.RemainingTimeVO;
import org.dherhf.common.Result;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrderServiceTest {

    @Mock
    private OrderMapper orderMapper;
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
    private OrderServiceImpl orderService;

    private LockSeatDTO lockSeatDTO;

    @BeforeAll
    static void initLambdaCache() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), ScheduleSeat.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Schedule.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Order.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Movie.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Cinema.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Hall.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), HallCell.class);
    }

    @BeforeEach
    void setUp() {
        lockSeatDTO = new LockSeatDTO();
        lockSeatDTO.setScheduleId(1L);
        lockSeatDTO.setSeatIds(List.of(10L, 11L));
        lockSeatDTO.setTicketCount(2);
    }

    @Test
    void lockSeat_success() {
        System.out.println("[OrderServiceTest] ▶ lockSeat_success");
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setMovieId(1L);
        schedule.setCinemaId(1L);
        schedule.setHallId(1L);
        schedule.setStatus("onsale");
        schedule.setPrice(new BigDecimal("45.00"));
        schedule.setShowDate(LocalDate.of(2026, 8, 15));
        schedule.setStartTime(LocalTime.of(14, 0));
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat ss1 = new ScheduleSeat();
        ss1.setId(100L);
        ss1.setHallCellId(10L);
        ss1.setStatus("available");
        ScheduleSeat ss2 = new ScheduleSeat();
        ss2.setId(101L);
        ss2.setHallCellId(11L);
        ss2.setStatus("available");
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(ss1, ss2));

        Movie movie = new Movie();
        movie.setName("流浪地球3");
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Cinema cinema = new Cinema();
        cinema.setName("万达影城");
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Hall hall = new Hall();
        hall.setName("IMAX厅");
        when(hallMapper.selectById(1L)).thenReturn(hall);

        HallCell hc1 = new HallCell();
        hc1.setSeatLabel("5排6座");
        HallCell hc2 = new HallCell();
        hc2.setSeatLabel("5排7座");
        when(hallCellMapper.selectList(any())).thenReturn(List.of(hc1, hc2));

        when(orderMapper.insert(any(Order.class))).thenReturn(1);
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);

        Result<LockSeatResultVO> result = orderService.lockSeat(1L, lockSeatDTO, "req-001");

        assertEquals(0, result.getCode());
        assertEquals("pending", result.getData().getStatus());
        assertEquals(new BigDecimal("90.00"), result.getData().getTotalAmount());
        System.out.println("[OrderServiceTest] ✓ lockSeat_success PASSED");
    }

    @Test
    void lockSeat_countMismatch_throws400() {
        System.out.println("[OrderServiceTest] ▶ lockSeat_countMismatch_throws400");
        lockSeatDTO.setTicketCount(3);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.lockSeat(1L, lockSeatDTO, "req-001"));
        assertEquals(400, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ lockSeat_countMismatch_throws400 PASSED");
    }

    @Test
    void lockSeat_seatAlreadyLocked_throws409() {
        System.out.println("[OrderServiceTest] ▶ lockSeat_seatAlreadyLocked_throws409");
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setStatus("onsale");
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat ss1 = new ScheduleSeat();
        ss1.setHallCellId(10L);
        ss1.setStatus("available");
        ScheduleSeat ss2 = new ScheduleSeat();
        ss2.setHallCellId(11L);
        ss2.setStatus("locked");
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(ss1, ss2));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.lockSeat(1L, lockSeatDTO, "req-001"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ lockSeat_seatAlreadyLocked_throws409 PASSED");
    }

    @Test
    void payOrder_success() {
        System.out.println("[OrderServiceTest] ▶ payOrder_success");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("pending");
        order.setScheduleId(1L);
        order.setMovieName("流浪地球3");
        when(orderMapper.selectById(1L)).thenReturn(order);

        ScheduleSeat lockedSeat = new ScheduleSeat();
        lockedSeat.setId(200L);
        lockedSeat.setStatus("locked");
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(lockedSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        Schedule schedule = new Schedule();
        schedule.setCinemaId(1L);
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        Cinema cinema = new Cinema();
        cinema.setAddress("北京市朝阳区");
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Result<PayResultVO> result = orderService.payOrder(1L, 1L, "req-002");

        assertEquals(0, result.getCode());
        assertEquals("paid", result.getData().getStatus());
        assertNotNull(result.getData().getPickupCode());
        System.out.println("[OrderServiceTest] ✓ payOrder_success PASSED");
    }

    @Test
    void payOrder_alreadyPaid_throws409() {
        System.out.println("[OrderServiceTest] ▶ payOrder_alreadyPaid_throws409");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("paid");
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.payOrder(1L, 1L, "req-002"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ payOrder_alreadyPaid_throws409 PASSED");
    }

    @Test
    void payOrder_cancelled_throws409() {
        System.out.println("[OrderServiceTest] ▶ payOrder_cancelled_throws409");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("cancelled");
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.payOrder(1L, 1L, "req-002"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ payOrder_cancelled_throws409 PASSED");
    }

    @Test
    void cancelOrder_success() {
        System.out.println("[OrderServiceTest] ▶ cancelOrder_success");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("pending");
        when(orderMapper.selectById(1L)).thenReturn(order);

        ScheduleSeat lockedSeat = new ScheduleSeat();
        lockedSeat.setId(200L);
        lockedSeat.setStatus("locked");
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(lockedSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        Result<Void> result = orderService.cancelOrder(1L, 1L, "req-003");

        assertEquals(0, result.getCode());
        assertEquals("cancelled", order.getStatus());
        System.out.println("[OrderServiceTest] ✓ cancelOrder_success PASSED");
    }

    @Test
    void cancelOrder_notPending_throws409() {
        System.out.println("[OrderServiceTest] ▶ cancelOrder_notPending_throws409");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("paid");
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.cancelOrder(1L, 1L, "req-003"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ cancelOrder_notPending_throws409 PASSED");
    }

    @Test
    void refundOrder_success() {
        System.out.println("[OrderServiceTest] ▶ refundOrder_success");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("paid");
        order.setScheduleId(1L);
        when(orderMapper.selectById(1L)).thenReturn(order);

        Schedule schedule = new Schedule();
        schedule.setShowDate(LocalDate.of(2026, 12, 31));
        schedule.setStartTime(LocalTime.of(14, 0));
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat soldSeat = new ScheduleSeat();
        soldSeat.setId(300L);
        soldSeat.setStatus("sold");
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(soldSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        Result<Void> result = orderService.refundOrder(1L, 1L, "req-004");

        assertEquals(0, result.getCode());
        assertEquals("refunded", order.getStatus());
        System.out.println("[OrderServiceTest] ✓ refundOrder_success PASSED");
    }

    @Test
    void refundOrder_notPaid_throws409() {
        System.out.println("[OrderServiceTest] ▶ refundOrder_notPaid_throws409");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("pending");
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.refundOrder(1L, 1L, "req-004"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ refundOrder_notPaid_throws409 PASSED");
    }

    @Test
    void refundOrder_showStarted_throws409() {
        System.out.println("[OrderServiceTest] ▶ refundOrder_showStarted_throws409");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("paid");
        order.setScheduleId(1L);
        when(orderMapper.selectById(1L)).thenReturn(order);

        Schedule schedule = new Schedule();
        schedule.setShowDate(LocalDate.of(2020, 1, 1));
        schedule.setStartTime(LocalTime.of(14, 0));
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.refundOrder(1L, 1L, "req-004"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ refundOrder_showStarted_throws409 PASSED");
    }

    @Test
    void pendingOrder_noPending_returnsFalse() {
        System.out.println("[OrderServiceTest] ▶ pendingOrder_noPending_returnsFalse");
        when(orderMapper.selectOne(any())).thenReturn(null);

        Result<org.dherhf.vo.PendingOrderVO> result = orderService.pendingOrder(1L);

        assertEquals(0, result.getCode());
        assertFalse(result.getData().getPending());
        System.out.println("[OrderServiceTest] ✓ pendingOrder_noPending_returnsFalse PASSED");
    }

    @Test
    void pendingOrder_hasPending_returnsTrue() {
        System.out.println("[OrderServiceTest] ▶ pendingOrder_hasPending_returnsTrue");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("pending");
        order.setMovieName("流浪地球3");
        order.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        when(orderMapper.selectOne(any())).thenReturn(order);

        Result<org.dherhf.vo.PendingOrderVO> result = orderService.pendingOrder(1L);

        assertEquals(0, result.getCode());
        assertTrue(result.getData().getPending());
        assertTrue(result.getData().getRemainingSeconds() > 0);
        System.out.println("[OrderServiceTest] ✓ pendingOrder_hasPending_returnsTrue PASSED");
    }

    @Test
    void remainingTime_expired_returns0() {
        System.out.println("[OrderServiceTest] ▶ remainingTime_expired_returns0");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("paid");
        when(orderMapper.selectById(1L)).thenReturn(order);

        Result<RemainingTimeVO> result = orderService.remainingTime(1L, 1L);

        assertEquals(0, result.getCode());
        assertTrue(result.getData().getExpired());
        System.out.println("[OrderServiceTest] ✓ remainingTime_expired_returns0 PASSED");
    }

    @Test
    void detail_success() {
        System.out.println("[OrderServiceTest] ▶ detail_success");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus("paid");
        order.setPickupCode("ABC123");
        when(orderMapper.selectById(1L)).thenReturn(order);

        Result<OrderDetailVO> result = orderService.detail(1L, 1L);

        assertEquals(0, result.getCode());
        assertEquals("ABC123", result.getData().getPickupCode());
        System.out.println("[OrderServiceTest] ✓ detail_success PASSED");
    }

    @Test
    void detail_notFound_throws404() {
        System.out.println("[OrderServiceTest] ▶ detail_notFound_throws404");
        when(orderMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.detail(1L, 1L));
        assertEquals(404, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ detail_notFound_throws404 PASSED");
    }

    @Test
    void detail_notOwnOrder_throws404() {
        System.out.println("[OrderServiceTest] ▶ detail_notOwnOrder_throws404");
        Order order = new Order();
        order.setId(1L);
        order.setUserId(999L);
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.detail(1L, 1L));
        assertEquals(404, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ detail_notOwnOrder_throws404 PASSED");
    }
}
