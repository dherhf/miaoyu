package org.dherhf.notification.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.notification.vo.NotificationVO;

public interface NotificationService {

    Result<PageResult<NotificationVO>> list(Long userId, String type, Integer isRead, Integer page, Integer size);

    Result<Void> markRead(Long id, Long userId);

    // TODO: SSE 实时推送
}
