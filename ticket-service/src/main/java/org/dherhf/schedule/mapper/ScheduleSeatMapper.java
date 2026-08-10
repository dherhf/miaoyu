package org.dherhf.schedule.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.dherhf.schedule.entity.ScheduleSeat;

import java.util.List;

/**
 * 场次座位数据访问接口。
 * <p>
 * 继承 MyBatis-Plus BaseMapper，提供 schedule_seats 表的基本 CRUD 操作，
 * 并提供锁座流程所需的排他锁查询方法。
 */
@Mapper
public interface ScheduleSeatMapper extends BaseMapper<ScheduleSeat> {

    /**
     * 对指定场次的座位加排他锁（FOR UPDATE），用于锁座流程。
     *
     * @param scheduleId  场次ID
     * @param hallCellIds 物理座位ID列表
     * @return 锁定的座位列表
     */
    @Select("<script>" +
            "SELECT * FROM schedule_seats " +
            "WHERE schedule_id = #{scheduleId} " +
            "AND hall_cell_id IN " +
            "<foreach item='id' collection='hallCellIds' open='(' separator=',' close=')'>" +
            "#{id}" +
            "</foreach> " +
            "FOR UPDATE" +
            "</script>")
    List<ScheduleSeat> selectForUpdate(@Param("scheduleId") Long scheduleId,
                                       @Param("hallCellIds") List<Long> hallCellIds);
}
