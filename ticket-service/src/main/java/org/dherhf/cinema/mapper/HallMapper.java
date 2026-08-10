package org.dherhf.cinema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.cinema.entity.Hall;

/**
 * 影厅表 Mapper 接口,继承 MyBatis-Plus {@link BaseMapper} 提供基础 CRUD。
 */
@Mapper
public interface HallMapper extends BaseMapper<Hall> {
}