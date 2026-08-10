package org.dherhf.notification.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.notification.entity.Notification;
import org.dherhf.notification.mapper.NotificationMapper;
import org.dherhf.notification.vo.NotificationVO;
import org.springframework.beans.BeanUtils;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 通知服务实现类。
 * <p>
 * 实现通知列表查询、标记已读和异步通知发送。
 * 通知发送通过 {@code @Async} 异步执行，先写入数据库再通过 SSE 推送。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;
    private final NotificationSseManager sseManager;

    /**
     * 分页查询用户通知列表，按创建时间倒序排列。
     *
     * @param userId 用户 ID
     * @param type   通知类型（可为空）
     * @param isRead 是否已读（可为空）
     * @param page   页码
     * @param size   每页条数
     * @return 分页通知列表
     */
    @Override
    public PageResult<NotificationVO> list(Long userId, String type, Integer isRead, Integer page, Integer size) {
        Page<Notification> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(type != null && !type.isBlank(), Notification::getType, type)
                .eq(isRead != null, Notification::getIsRead, isRead)
                .orderByDesc(Notification::getCreatedAt);

        IPage<Notification> result = notificationMapper.selectPage(pageParam, wrapper);
        List<NotificationVO> records = result.getRecords().stream()
                .map(this::toVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    /**
     * 标记指定通知为已读，校验通知归属当前用户。
     *
     * @param id     通知 ID
     * @param userId 用户 ID（用于权限校验）
     */
    @Override
    public void markRead(Long id, Long userId) {
        Notification notification = notificationMapper.selectById(id);
        if (notification == null || !notification.getUserId().equals(userId)) {
            throw new BusinessException(404, "通知不存在");
        }
        notification.setIsRead(1);
        notificationMapper.updateById(notification);
    }

    /**
     * 异步发送通知：构建通知实体写入数据库，再通过 SSE 推送到用户在线连接。
     *
     * @param userId         用户 ID
     * @param type           通知类型
     * @param title          通知标题
     * @param content        通知内容
     * @param relatedOrderId 关联订单 ID
     */
    @Async
    @Override
    public void sendNotification(Long userId, String type, String title, String content, Long relatedOrderId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .content(content)
                .relatedOrderId(relatedOrderId)
                .isRead(0)
                .build();
        notificationMapper.insert(notification);
        notification.setCreatedAt(LocalDateTime.now());
        sseManager.send(userId, toVO(notification));
        log.info("Notification sent: userId={}, type={}, title={}", userId, type, title);
    }

    /**
     * 将通知实体转换为 VO。
     *
     * @param notification 通知实体
     * @return 通知 VO
     */
    private NotificationVO toVO(Notification notification) {
        NotificationVO vo = new NotificationVO();
        BeanUtils.copyProperties(notification, vo);
        return vo;
    }
}
