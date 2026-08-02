package org.dherhf.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.BusinessException;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.entity.Notification;
import org.dherhf.mapper.NotificationMapper;
import org.dherhf.vo.NotificationVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;

    @Override
    public Result<PageResult<NotificationVO>> list(Long userId, String type, Integer isRead, Integer page, Integer size) {
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

        return Result.success(new PageResult<>(result.getTotal(), page, size, records));
    }

    @Override
    public Result<Void> markRead(Long id, Long userId) {
        Notification notification = notificationMapper.selectById(id);
        if (notification == null || !notification.getUserId().equals(userId)) {
            throw new BusinessException(404, "通知不存在");
        }
        notification.setIsRead(1);
        notificationMapper.updateById(notification);
        return Result.success();
    }

    private NotificationVO toVO(Notification notification) {
        NotificationVO vo = new NotificationVO();
        BeanUtils.copyProperties(notification, vo);
        return vo;
    }
}
