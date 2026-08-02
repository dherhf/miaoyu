package org.dherhf.notification.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.notification.entity.Notification;

@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {
}
