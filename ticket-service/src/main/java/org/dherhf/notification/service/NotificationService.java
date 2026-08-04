package org.dherhf.notification.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.notification.vo.NotificationVO;

public interface NotificationService {

    PageResult<NotificationVO> list(Long userId, String type, Integer isRead, Integer page, Integer size);

    void markRead(Long id, Long userId);

    void sendNotification(Long userId, String type, String title, String content, Long relatedOrderId);
}
