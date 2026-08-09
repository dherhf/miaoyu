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

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;
    private final NotificationSseManager sseManager;

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

    @Override
    public void markRead(Long id, Long userId) {
        Notification notification = notificationMapper.selectById(id);
        if (notification == null || !notification.getUserId().equals(userId)) {
            throw new BusinessException(404, "通知不存在");
        }
        notification.setIsRead(1);
        notificationMapper.updateById(notification);
    }

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

    private NotificationVO toVO(Notification notification) {
        NotificationVO vo = new NotificationVO();
        BeanUtils.copyProperties(notification, vo);
        return vo;
    }
}
