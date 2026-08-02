package org.dherhf.service;

import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.vo.NotificationVO;

public interface NotificationService {

    Result<PageResult<NotificationVO>> list(Long userId, String type, Integer isRead, Integer page, Integer size);

    Result<Void> markRead(Long id, Long userId);

    // TODO: SSE 实时推送
}
