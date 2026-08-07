package org.dherhf.order.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.order.dto.InternalLockSeatDTO;
import org.dherhf.order.entity.Order;
import org.dherhf.order.client.PaymentClient;
import org.dherhf.order.config.PaymentProperties;
import org.dherhf.order.vo.LockSeatResultVO;
import org.dherhf.order.vo.OrderDetailVO;
import org.dherhf.order.vo.OrderListVO;
import org.dherhf.order.vo.PayResultVO;
import org.dherhf.common.result.PageResult;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InternalOrderServiceTest {

    @Mock
    private org.dherhf.order.mapper.OrderMapper orderMapper;
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
    private PaymentClient paymentClient;
    @Mock
    private PaymentProperties paymentProperties;
    @Mock
    private RLock rLock;

    @InjectMocks
    private OrderServiceImpl orderService;

    @BeforeAll
    static void initLambdaCache() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), ScheduleSeat.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Schedule.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Order.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Cinema.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), Hall.class);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(configuration, ""), HallCell.class);
    }

    @BeforeEach
    void setUp() throws Exception {
        when(idempotentService.getIfPresent(any(), any(), any())).thenReturn(null);
        when(redissonClient.getLock(anyString())).thenReturn(rLock);
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(rLock.isHeldByCurrentThread()).thenReturn(true);
        doNothing().when(rLock).unlock();
        doNothing().when(idempotentService).put(any(), anyString(), any());
        doNothing().when(orderTimeoutService).schedule(any());
        doNothing().when(orderTimeoutService).cancel(any());
        doNothing().when(notificationService).sendNotification(anyLong(), anyString(), anyString(), anyString(), any());
    }

    // ========== internalLockSeat ==========

    @Test
    void internalLockSeat_success() {
        System.out.println("[InternalOrderServiceTest] ▶ internalLockSeat_success");

        Schedule schedule = Schedule.builder()
                .id(1L).movieId(1L).cinemaId(1L).hallId(1L)
                .status("onsale").price(new BigDecimal("45.00"))
                .showDate(LocalDate.of(2026, 8, 15))
                .startTime(LocalTime.of(14, 0))
                .build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat ss1 = ScheduleSeat.builder().id(100L).hallCellId(10L).seatIndex(0).status("available").build();
        ScheduleSeat ss2 = ScheduleSeat.builder().id(101L).hallCellId(11L).seatIndex(1).status("available").build();
        when(scheduleSeatMapper.selectForUpdate(any(), any())).thenReturn(List.of(ss1, ss2));

        when(movieMapper.selectById(1L)).thenReturn(org.dherhf.movie.entity.Movie.builder().name("流浪地球3").build());
        when(cinemaMapper.selectById(1L)).thenReturn(Cinema.builder().name("万达影城").build());
        when(hallMapper.selectById(1L)).thenReturn(Hall.builder().name("IMAX厅").build());

        HallCell hc1 = HallCell.builder().seatLabel("5排6座").build();
        HallCell hc2 = HallCell.builder().seatLabel("5排7座").build();
        when(hallCellMapper.selectList(any())).thenReturn(List.of(hc1, hc2));

        when(orderMapper.insert(any(Order.class))).thenReturn(1);
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);

        InternalLockSeatDTO dto = InternalLockSeatDTO.builder()
                .userId(1L).scheduleId(1L).seatIds(List.of(10L, 11L)).ticketCount(2)
                .requestId("req-internal-001")
                .build();

        LockSeatResultVO result = orderService.internalLockSeat(dto);

        assertEquals("pending", result.getStatus());
        assertEquals(new BigDecimal("90.00"), result.getTotalAmount());
        System.out.println("[InternalOrderServiceTest] ✓ internalLockSeat_success PASSED");
    }

    @Test
    void internalLockSeat_idempotent_returnsCached() {
        System.out.println("[InternalOrderServiceTest] ▶ internalLockSeat_idempotent_returnsCached");

        LockSeatResultVO cached = LockSeatResultVO.builder()
                .id(1L).status("pending").totalAmount(new BigDecimal("90.00"))
                .build();
        when(idempotentService.getIfPresent(any(), eq("req-internal-002"), eq(LockSeatResultVO.class))).thenReturn(cached);

        InternalLockSeatDTO dto = InternalLockSeatDTO.builder()
                .userId(1L).scheduleId(1L).seatIds(List.of(10L)).ticketCount(1)
                .requestId("req-internal-002")
                .build();

        LockSeatResultVO result = orderService.internalLockSeat(dto);

        assertEquals("pending", result.getStatus());
        assertEquals(new BigDecimal("90.00"), result.getTotalAmount());
        // Should not hit DB at all
        verify(scheduleMapper, never()).selectById(any());
        System.out.println("[InternalOrderServiceTest] ✓ internalLockSeat_idempotent_returnsCached PASSED");
    }

    // ========== internalPayOrder ==========

    @Test
    void internalPayOrder_success() {
        System.out.println("[InternalOrderServiceTest] ▶ internalPayOrder_success");

        Order order = Order.builder()
                .id(1L).userId(1L).status("pending").scheduleId(1L)
                .movieName("流浪地球3").orderNo("MY20260807000001")
                .totalAmount(new BigDecimal("88.00")).build();
        when(orderMapper.selectById(1L)).thenReturn(order);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        when(paymentProperties.getExpireMinutes()).thenReturn(15);
        when(paymentProperties.getPayeeUserId()).thenReturn("platform-001");

        PaymentClient.CreatePaymentResponse payResp = new PaymentClient.CreatePaymentResponse();
        PaymentClient.CreatePaymentData payData = new PaymentClient.CreatePaymentData();
        payData.setPaymentIntent("PAY20260807.intent.sig");
        payData.setPayUrl("https://aiztf.com/pay?intent=xxx");
        payData.setExpiresAt("2026-08-07T13:00:00+08:00");
        payResp.setSuccess(true);
        payResp.setCode("0");
        payResp.setData(payData);
        when(paymentClient.createPayment(anyString(), anyString(), anyString()))
                .thenReturn(payResp);

        PayResultVO result = orderService.internalPayOrder(1L, 1L, "req-internal-pay-001");

        assertEquals("pending", result.getStatus());
        assertNotNull(result.getPayUrl());
        assertEquals("PAY20260807.intent.sig", result.getPaymentNo());
        System.out.println("[InternalOrderServiceTest] ✓ internalPayOrder_success PASSED");
    }

    @Test
    void internalPayOrder_alreadyPaid_throws409() {
        System.out.println("[InternalOrderServiceTest] ▶ internalPayOrder_alreadyPaid_throws409");

        Order order = Order.builder().id(1L).userId(1L).status("paid").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.internalPayOrder(1L, 1L, "req-internal-pay-002"));
        assertEquals(409, ex.getCode());
        System.out.println("[InternalOrderServiceTest] ✓ internalPayOrder_alreadyPaid_throws409 PASSED");
    }

    // ========== internalCancelOrder ==========

    @Test
    void internalCancelOrder_success() {
        System.out.println("[InternalOrderServiceTest] ▶ internalCancelOrder_success");

        Order order = Order.builder().id(1L).userId(1L).status("pending").scheduleId(1L).build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        ScheduleSeat lockedSeat = ScheduleSeat.builder().id(200L).seatIndex(0).status("locked").build();
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(lockedSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        orderService.internalCancelOrder(1L, 1L, "req-internal-cancel-001");

        assertEquals("cancelled", order.getStatus());
        System.out.println("[InternalOrderServiceTest] ✓ internalCancelOrder_success PASSED");
    }

    @Test
    void internalCancelOrder_notPending_throws409() {
        System.out.println("[InternalOrderServiceTest] ▶ internalCancelOrder_notPending_throws409");

        Order order = Order.builder().id(1L).userId(1L).status("paid").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.internalCancelOrder(1L, 1L, "req-internal-cancel-002"));
        assertEquals(409, ex.getCode());
        System.out.println("[InternalOrderServiceTest] ✓ internalCancelOrder_notPending_throws409 PASSED");
    }

    // ========== internalRefundOrder ==========

    @Test
    void internalRefundOrder_success() {
        System.out.println("[InternalOrderServiceTest] ▶ internalRefundOrder_success");

        Order order = Order.builder().id(1L).userId(1L).status("paid").scheduleId(1L).build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        Schedule schedule = Schedule.builder()
                .showDate(LocalDate.of(2026, 12, 31))
                .startTime(LocalTime.of(14, 0))
                .build();
        when(scheduleMapper.selectById(1L)).thenReturn(schedule);

        ScheduleSeat soldSeat = ScheduleSeat.builder().id(300L).seatIndex(0).status("sold").build();
        when(scheduleSeatMapper.selectList(any())).thenReturn(List.of(soldSeat));
        when(scheduleSeatMapper.updateById(any(ScheduleSeat.class))).thenReturn(1);
        when(orderMapper.updateById(any(Order.class))).thenReturn(1);

        orderService.internalRefundOrder(1L, 1L, "req-internal-refund-001");

        assertEquals("refunded", order.getStatus());
        System.out.println("[InternalOrderServiceTest] ✓ internalRefundOrder_success PASSED");
    }

    @Test
    void internalRefundOrder_notPaid_throws409() {
        System.out.println("[InternalOrderServiceTest] ▶ internalRefundOrder_notPaid_throws409");

        Order order = Order.builder().id(1L).userId(1L).status("pending").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.internalRefundOrder(1L, 1L, "req-internal-refund-002"));
        assertEquals(409, ex.getCode());
        System.out.println("[InternalOrderServiceTest] ✓ internalRefundOrder_notPaid_throws409 PASSED");
    }

    // ========== internalListOrders ==========

    @Test
    void internalListOrders_success() {
        System.out.println("[InternalOrderServiceTest] ▶ internalListOrders_success");

        Order order = Order.builder()
                .id(1L).userId(1L).status("paid")
                .movieName("流浪地球3").cinemaName("万达影城")
                .orderNo("ORD20260804001")
                .totalAmount(new BigDecimal("90.00"))
                .createdAt(LocalDateTime.now())
                .build();

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Order> page = new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(1, 20);
        page.setRecords(List.of(order));
        page.setTotal(1);
        when(orderMapper.selectPage(any(), any())).thenReturn(page);

        PageResult<OrderListVO> result = orderService.internalListOrders(
                1L, "流浪", null, null, null, 1, 20);

        assertEquals(1L, result.getTotal());
        assertEquals(1, result.getRecords().size());
        assertEquals("流浪地球3", result.getRecords().get(0).getMovieName());
        System.out.println("[InternalOrderServiceTest] ✓ internalListOrders_success PASSED");
    }

    @Test
    void internalListOrders_empty() {
        System.out.println("[InternalOrderServiceTest] ▶ internalListOrders_empty");

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Order> page = new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(1, 20);
        page.setRecords(List.of());
        page.setTotal(0);
        when(orderMapper.selectPage(any(), any())).thenReturn(page);

        PageResult<OrderListVO> result = orderService.internalListOrders(
                999L, null, null, null, null, 1, 20);

        assertEquals(0L, result.getTotal());
        assertTrue(result.getRecords().isEmpty());
        System.out.println("[InternalOrderServiceTest] ✓ internalListOrders_empty PASSED");
    }

    // ========== detail (used by GET /internal/orders/{id}) ==========

    @Test
    void internalDetail_success() {
        System.out.println("[InternalOrderServiceTest] ▶ internalDetail_success");

        Order order = Order.builder()
                .id(1L).userId(1L).status("paid")
                .movieName("流浪地球3")
                .build();
        when(orderMapper.selectById(1L)).thenReturn(order);
        when(pickupCodeService.getOrCreateCode(1L)).thenReturn("AB3K9X");

        OrderDetailVO result = orderService.detail(1L, 1L);

        assertEquals("AB3K9X", result.getPickupCode());
        assertEquals("流浪地球3", result.getMovieName());
        System.out.println("[InternalOrderServiceTest] ✓ internalDetail_success PASSED");
    }

    @Test
    void internalDetail_notFound_throws404() {
        System.out.println("[InternalOrderServiceTest] ▶ internalDetail_notFound_throws404");

        when(orderMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.detail(1L, 1L));
        assertEquals(404, ex.getCode());
        System.out.println("[InternalOrderServiceTest] ✓ internalDetail_notFound_throws404 PASSED");
    }

    @Test
    void internalDetail_notOwnOrder_throws404() {
        System.out.println("[InternalOrderServiceTest] ▶ internalDetail_notOwnOrder_throws404");

        Order order = Order.builder().id(1L).userId(999L).build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> orderService.detail(1L, 1L));
        assertEquals(404, ex.getCode());
        System.out.println("[InternalOrderServiceTest] ✓ internalDetail_notOwnOrder_throws404 PASSED");
    }
}
