package org.dherhf.notification.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.notification.vo.NotificationVO;

/**
 * 通知服务接口。
 * <p>
 * 定义通知列表查询、标记已读和异步发送通知的业务方法。
 */
public interface NotificationService {

    /**
     * 分页查询用户通知列表。
     *
     * @param userId 用户 ID
     * @param type   通知类型
     * @param isRead 是否已读
     * @param page   页码
     * @param size   每页条数
     * @return 分页通知列表
     */
    PageResult<NotificationVO> list(Long userId, String type, Integer isRead, Integer page, Integer size);

    /**
     * 标记指定通知为已读。
     *
     * @param id     通知 ID
     * @param userId 用户 ID（用于权限校验）
     */
    void markRead(Long id, Long userId);

    /**
     * 异步发送通知：写入数据库并通过 SSE 推送到用户在线连接。
     *
     * @param userId          用户 ID
     * @param type            通知类型
     * @param title           通知标题
     * @param content         通知内容
     * @param relatedOrderId  关联订单 ID
     */
    void sendNotification(Long userId, String type, String title, String content, Long relatedOrderId);
}
