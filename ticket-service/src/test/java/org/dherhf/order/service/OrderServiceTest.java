package org.dherhf.order.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.order.mapper.OrderMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.order.dto.LockSeatDTO;
import org.dherhf.movie.entity.Movie;
import org.dherhf.order.entity.Order;
import org.dherhf.order.vo.PendingOrderVO;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.order.vo.LockSeatResultVO;
import org.dherhf.order.vo.OrderDetailVO;
import org.dherhf.order.vo.PayResultVO;
import org.dherhf.order.vo.RemainingTimeVO;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import java.util.concurrent.TimeUnit;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
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
    @Mock
    private IdempotentService idempotentService;
    @Mock
    private OrderTimeoutService orderTimeoutService;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private org.dherhf.notification.service.NotificationService notificationService;
    @Mock
    private org.dherhf.schedule.service.SeatBitmapService seatBitmapService;
    @Mock
    private PickupCodeService pickupCodeService;
    @Mock
    private RLock rLock;

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
    void setUp() throws Exception {
        lockSeatDTO = LockSeatDTO.builder().scheduleId(1L).seatIds(List.of(10L, 11L)).ticketCount(2).build();

        // Common stubs for all tests
        when(idempotentService.getIfPresent(any(), any())).thenReturn(null);
        when(redissonClient.getLock(anyString())).thenReturn(rLock);
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(rLock.isHeldByCurrentThread()).thenReturn(true);
        doNothing().when(rLock).unlock();
        doNothing().when(idempotentService).put(anyString(), any());
        doNothing().when(orderTimeoutService).schedule(any());
        doNothing().when(orderTimeoutService).cancel(any());
        doNothing().when(notificationService).sendNotification(anyLong(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void lockSeat_success() {
        System.out.println("[OrderServiceTest] ▶ lockSeat_success");
        Schedule schedule = Schedule.builder().id(1L).movieId(1L).cinemaId(1L).hallId(1L).status("onsale").price(new BigDecimal("45.00")).showDate(LocalDate.of(2026, 8, 15)).startTime(LocalTime.of(14, 0)).build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat ss1 = ScheduleSeat.builder().id(100L).hallCellId(10L).seatIndex(0).status("available").build();
        ScheduleSeat ss2 = ScheduleSeat.builder().id(101L).hallCellId(11L).seatIndex(1).status("available").build();
        when(scheduleSeatMapper.selectForUpdate(any(), any())).thenReturn(List.of(ss1, ss2));

        Movie movie = Movie.builder().name("流浪地球3").build();
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Cinema cinema = Cinema.builder().name("万达影城").build();
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Hall hall = Hall.builder().name("IMAX厅").build();
        when(hallMapper.selectById(1L)).thenReturn(hall);

        HallCell hc1 = HallCell.builder().seatLabel("5排6座").build();
        HallCell hc2 = HallCell.builder().seatLabel("5排7座").build();
        when(hallCellMapper.selectList(any())).thenReturn(List.of(hc1, hc2));

        when(orderMapper.insert(any(Order.class))).thenReturn(1);
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);

        LockSeatResultVO result = orderService.lockSeat(1L, lockSeatDTO, "req-001");

        assertEquals("pending", result.getStatus());
        assertEquals(new BigDecimal("90.00"), result.getTotalAmount());
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
        Schedule schedule = Schedule.builder().id(1L).status("onsale").build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat ss1 = ScheduleSeat.builder().hallCellId(10L).status("available").build();
        ScheduleSeat ss2 = ScheduleSeat.builder().hallCellId(11L).status("locked").build();
        when(scheduleSeatMapper.selectForUpdate(any(), any())).thenReturn(List.of(ss1, ss2));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.lockSeat(1L, lockSeatDTO, "req-001"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ lockSeat_seatAlreadyLocked_throws409 PASSED");
    }

    @Test
    void payOrder_success() {
        System.out.println("[OrderServiceTest] ▶ payOrder_success");
        Order order = Order.builder().id(1L).userId(1L).status("pending").scheduleId(1L).movieName("流浪地球3").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        ScheduleSeat lockedSeat = ScheduleSeat.builder().id(200L).seatIndex(0).status("locked").build();
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(lockedSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        Schedule schedule = Schedule.builder().cinemaId(1L).build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        Cinema cinema = Cinema.builder().address("北京市朝阳区").build();
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        when(pickupCodeService.getOrCreateCode(1L)).thenReturn("AB3K9X");

        PayResultVO result = orderService.payOrder(1L, 1L, "req-002");

        assertEquals("paid", result.getStatus());
        assertNotNull(result.getPickupCode());
        System.out.println("[OrderServiceTest] ✓ payOrder_success PASSED");
    }

    @Test
    void payOrder_alreadyPaid_throws409() {
        System.out.println("[OrderServiceTest] ▶ payOrder_alreadyPaid_throws409");
        Order order = Order.builder().id(1L).userId(1L).status("paid").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.payOrder(1L, 1L, "req-002"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ payOrder_alreadyPaid_throws409 PASSED");
    }

    @Test
    void payOrder_cancelled_throws409() {
        System.out.println("[OrderServiceTest] ▶ payOrder_cancelled_throws409");
        Order order = Order.builder().id(1L).userId(1L).status("cancelled").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.payOrder(1L, 1L, "req-002"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ payOrder_cancelled_throws409 PASSED");
    }

    @Test
    void cancelOrder_success() {
        System.out.println("[OrderServiceTest] ▶ cancelOrder_success");
        Order order = Order.builder().id(1L).userId(1L).status("pending").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        ScheduleSeat lockedSeat = ScheduleSeat.builder().id(200L).seatIndex(0).status("locked").build();
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(lockedSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        orderService.cancelOrder(1L, 1L, "req-003");

        assertEquals("cancelled", order.getStatus());
        verify(pickupCodeService).removeCode(1L);
        System.out.println("[OrderServiceTest] ✓ cancelOrder_success PASSED");
    }

    @Test
    void cancelOrder_notPending_throws409() {
        System.out.println("[OrderServiceTest] ▶ cancelOrder_notPending_throws409");
        Order order = Order.builder().id(1L).userId(1L).status("paid").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.cancelOrder(1L, 1L, "req-003"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ cancelOrder_notPending_throws409 PASSED");
    }

    @Test
    void refundOrder_success() {
        System.out.println("[OrderServiceTest] ▶ refundOrder_success");
        Order order = Order.builder().id(1L).userId(1L).status("paid").scheduleId(1L).build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        Schedule schedule = Schedule.builder().showDate(LocalDate.of(2026, 12, 31)).startTime(LocalTime.of(14, 0)).build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat soldSeat = ScheduleSeat.builder().id(300L).seatIndex(0).status("sold").build();
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(soldSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        orderService.refundOrder(1L, 1L, "req-004");

        assertEquals("refunded", order.getStatus());
        verify(pickupCodeService).removeCode(1L);
        System.out.println("[OrderServiceTest] ✓ refundOrder_success PASSED");
    }

    @Test
    void refundOrder_notPaid_throws409() {
        System.out.println("[OrderServiceTest] ▶ refundOrder_notPaid_throws409");
        Order order = Order.builder().id(1L).userId(1L).status("pending").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.refundOrder(1L, 1L, "req-004"));
        assertEquals(409, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ refundOrder_notPaid_throws409 PASSED");
    }

    @Test
    void refundOrder_showStarted_throws409() {
        System.out.println("[OrderServiceTest] ▶ refundOrder_showStarted_throws409");
        Order order = Order.builder().id(1L).userId(1L).status("paid").scheduleId(1L).build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        Schedule schedule = Schedule.builder().showDate(LocalDate.of(2020, 1, 1)).startTime(LocalTime.of(14, 0)).build();
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

        PendingOrderVO result = orderService.pendingOrder(1L);

        assertFalse(result.getPending());
        System.out.println("[OrderServiceTest] ✓ pendingOrder_noPending_returnsFalse PASSED");
    }

    @Test
    void pendingOrder_hasPending_returnsTrue() {
        System.out.println("[OrderServiceTest] ▶ pendingOrder_hasPending_returnsTrue");
        Order order = Order.builder().id(1L).userId(1L).status("pending").movieName("流浪地球3").createdAt(LocalDateTime.now().minusMinutes(5)).build();
        when(orderMapper.selectOne(any())).thenReturn(order);

        PendingOrderVO result = orderService.pendingOrder(1L);

        assertTrue(result.getPending());
        assertTrue(result.getRemainingSeconds() > 0);
        System.out.println("[OrderServiceTest] ✓ pendingOrder_hasPending_returnsTrue PASSED");
    }

    @Test
    void remainingTime_expired_returns0() {
        System.out.println("[OrderServiceTest] ▶ remainingTime_expired_returns0");
        Order order = Order.builder().id(1L).userId(1L).status("paid").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        RemainingTimeVO result = orderService.remainingTime(1L, 1L);

        assertTrue(result.getExpired());
        System.out.println("[OrderServiceTest] ✓ remainingTime_expired_returns0 PASSED");
    }

    @Test
    void detail_success() {
        System.out.println("[OrderServiceTest] ▶ detail_success");
        Order order = Order.builder().id(1L).userId(1L).status("paid").build();
        when(orderMapper.selectById(1L)).thenReturn(order);
        when(pickupCodeService.getOrCreateCode(1L)).thenReturn("AB3K9X");

        OrderDetailVO result = orderService.detail(1L, 1L);

        assertEquals("AB3K9X", result.getPickupCode());
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
        Order order = Order.builder().id(1L).userId(999L).build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.detail(1L, 1L));
        assertEquals(404, ex.getCode());
        System.out.println("[OrderServiceTest] ✓ detail_notOwnOrder_throws404 PASSED");
    }
}
