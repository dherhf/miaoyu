package org.dherhf.schedule.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.schedule.entity.Schedule;

/**
 * 场次数据访问接口。
 * <p>
 * 继承 MyBatis-Plus BaseMapper，提供 schedules 表的基本 CRUD 操作。
 */
@Mapper
public interface ScheduleMapper extends BaseMapper<Schedule> {
}
