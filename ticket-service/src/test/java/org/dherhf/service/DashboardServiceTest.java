package org.dherhf.service;

import org.dherhf.entity.Order;
import org.dherhf.mapper.OrderMapper;
import org.dherhf.mapper.ScheduleMapper;
import org.dherhf.mapper.ScheduleSeatMapper;
import org.dherhf.vo.MovieRankingVO;
import org.dherhf.common.Result;
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

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    void moviesRanking_emptyOrders_returnsEmptyList() {
        System.out.println("[DashboardServiceTest] ▶ moviesRanking_emptyOrders_returnsEmptyList");
        when(orderMapper.selectList(any())).thenReturn(java.util.List.of());

        Result<List<MovieRankingVO>> result = dashboardService.moviesRanking("ticket_count");

        assertEquals(0, result.getCode());
        assertNotNull(result.getData());
        System.out.println("[DashboardServiceTest] ✓ moviesRanking_emptyOrders_returnsEmptyList PASSED");
    }

    @Test
    void moviesRanking_withPaidOrders() {
        System.out.println("[DashboardServiceTest] ▶ moviesRanking_withPaidOrders");
        Order o1 = new Order();
        o1.setMovieName("流浪地球3");
        o1.setStatus("paid");
        o1.setTicketCount(2);
        o1.setTotalAmount(new BigDecimal("90.00"));
        o1.setCreatedAt(LocalDateTime.now());

        Order o2 = new Order();
        o2.setMovieName("流浪地球3");
        o2.setStatus("paid");
        o2.setTicketCount(3);
        o2.setTotalAmount(new BigDecimal("135.00"));
        o2.setCreatedAt(LocalDateTime.now());

        Order o3 = new Order();
        o3.setMovieName("哪吒2");
        o3.setStatus("paid");
        o3.setTicketCount(1);
        o3.setTotalAmount(new BigDecimal("45.00"));
        o3.setCreatedAt(LocalDateTime.now());

        when(orderMapper.selectList(any())).thenReturn(List.of(o1, o2, o3));

        Result<List<MovieRankingVO>> result = dashboardService.moviesRanking("ticket_count");

        assertEquals(0, result.getCode());
        assertEquals(2, result.getData().size());
        // 流浪地球3 should be first with ticketCount=5
        assertEquals("流浪地球3", result.getData().get(0).getMovieName());
        assertEquals(5, result.getData().get(0).getTicketCount());
        System.out.println("[DashboardServiceTest] ✓ moviesRanking_withPaidOrders PASSED");
    }
}
