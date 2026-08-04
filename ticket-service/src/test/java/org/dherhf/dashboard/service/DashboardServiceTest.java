package org.dherhf.dashboard.service;

import org.dherhf.order.entity.Order;
import org.dherhf.order.mapper.OrderMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.movie.vo.MovieRankingVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private OrderMapper orderMapper;
    @Mock
    private ScheduleMapper scheduleMapper;
    @Mock
    private ScheduleSeatMapper scheduleSeatMapper;
    @Mock
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    @Mock
    private tools.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    void moviesRanking_emptyOrders_returnsEmptyList() {
        System.out.println("[DashboardServiceTest] ▶ moviesRanking_emptyOrders_returnsEmptyList");
        when(orderMapper.selectList(any())).thenReturn(java.util.List.of());

        List<MovieRankingVO> result = dashboardService.moviesRanking("ticket_count");

        assertNotNull(result);
        System.out.println("[DashboardServiceTest] ✓ moviesRanking_emptyOrders_returnsEmptyList PASSED");
    }

    @Test
    void moviesRanking_withPaidOrders() {
        System.out.println("[DashboardServiceTest] ▶ moviesRanking_withPaidOrders");
        Order o1 = Order.builder()
                .movieName("流浪地球3")
                .status("paid")
                .ticketCount(2)
                .totalAmount(new BigDecimal("90.00"))
                .createdAt(LocalDateTime.now())
                .build();

        Order o2 = Order.builder()
                .movieName("流浪地球3")
                .status("paid")
                .ticketCount(3)
                .totalAmount(new BigDecimal("135.00"))
                .createdAt(LocalDateTime.now())
                .build();

        Order o3 = Order.builder()
                .movieName("哪吒2")
                .status("paid")
                .ticketCount(1)
                .totalAmount(new BigDecimal("45.00"))
                .createdAt(LocalDateTime.now())
                .build();

        when(orderMapper.selectList(any())).thenReturn(List.of(o1, o2, o3));

        List<MovieRankingVO> result = dashboardService.moviesRanking("ticket_count");

        assertEquals(2, result.size());
        // 流浪地球3 should be first with ticketCount=5
        assertEquals("流浪地球3", result.getFirst().getMovieName());
        assertEquals(5, result.getFirst().getTicketCount());
        System.out.println("[DashboardServiceTest] ✓ moviesRanking_withPaidOrders PASSED");
    }
}
