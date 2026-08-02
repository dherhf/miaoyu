package org.dherhf.order.service;

import org.dherhf.common.exception.BusinessException;
import org.dherhf.order.entity.Order;
import org.dherhf.auth.entity.User;
import org.dherhf.order.mapper.OrderMapper;
import org.dherhf.auth.mapper.UserMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderMapper orderMapper;
    @Mock
    private UserMapper userMapper;
    @Mock
    private ScheduleSeatMapper scheduleSeatMapper;
    @Mock
    private HallCellMapper hallCellMapper;

    @InjectMocks
    private AdminOrderServiceImpl adminOrderService;

    @Test
    void detail_notFound_throws404() {
        System.out.println("[AdminOrderServiceTest] ▶ detail_notFound_throws404");
        when(orderMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> adminOrderService.detail(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[AdminOrderServiceTest] ✓ detail_notFound_throws404 PASSED");
    }

    @Test
    void detail_success() {
        System.out.println("[AdminOrderServiceTest] ▶ detail_success");
        Order order = Order.builder().id(1L).userId(1L).status("paid").orderNo("20260730100001").movieName("流浪地球3").cinemaName("万达影城").build();
        when(orderMapper.selectById(1L)).thenReturn(order);

        User user = User.builder().id(1L).phone("encrypted_phone_data").build();
        when(userMapper.selectById(1L)).thenReturn(user);

        when(scheduleSeatMapper.selectList(any())).thenReturn(java.util.List.of());

        AdminOrderDetailVO result = adminOrderService.detail(1L);

        assertEquals("流浪地球3", result.getMovieName());
        assertNotNull(result.getUserPhone());
        System.out.println("[AdminOrderServiceTest] ✓ detail_success PASSED");
    }
}
