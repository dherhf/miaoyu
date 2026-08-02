package org.dherhf.schedule.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.schedule.entity.Schedule;

@Mapper
public interface ScheduleMapper extends BaseMapper<Schedule> {
}
