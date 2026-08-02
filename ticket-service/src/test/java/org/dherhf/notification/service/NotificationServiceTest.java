package org.dherhf.notification.service;

import org.dherhf.common.exception.BusinessException;
import org.dherhf.notification.entity.Notification;
import org.dherhf.notification.mapper.NotificationMapper;
import org.dherhf.notification.service.NotificationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationMapper notificationMapper;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @Test
    void markRead_success() {
        System.out.println("[NotificationServiceTest] ▶ markRead_success");
        Notification notification = new Notification();
        notification.setId(1L);
        notification.setUserId(1L);
        notification.setIsRead(0);
        when(notificationMapper.selectById(1L)).thenReturn(notification);
        when(notificationMapper.updateById(any(Notification.class))).thenReturn(1);

        notificationService.markRead(1L, 1L);

        verify(notificationMapper).updateById(any(Notification.class));
        System.out.println("[NotificationServiceTest] ✓ markRead_success PASSED");
    }

    @Test
    void markRead_notFound_throws404() {
        System.out.println("[NotificationServiceTest] ▶ markRead_notFound_throws404");
        when(notificationMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> notificationService.markRead(1L, 1L));
        assertEquals(404, ex.getCode());
        System.out.println("[NotificationServiceTest] ✓ markRead_notFound_throws404 PASSED");
    }

    @Test
    void markRead_notOwnNotification_throws404() {
        System.out.println("[NotificationServiceTest] ▶ markRead_notOwnNotification_throws404");
        Notification notification = new Notification();
        notification.setId(1L);
        notification.setUserId(999L);
        when(notificationMapper.selectById(1L)).thenReturn(notification);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> notificationService.markRead(1L, 1L));
        assertEquals(404, ex.getCode());
        System.out.println("[NotificationServiceTest] ✓ markRead_notOwnNotification_throws404 PASSED");
    }
}
