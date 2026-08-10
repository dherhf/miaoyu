package org.dherhf.notification.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.notification.entity.Notification;

/**
 * 通知 Mapper 接口，继承 MyBatis-Plus BaseMapper，提供通知的 CRUD 数据库操作。
 */
@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {
}
