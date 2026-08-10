package org.dherhf.cinema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.cinema.entity.Cinema;

/**
 * 影院表 Mapper 接口,继承 MyBatis-Plus {@link BaseMapper} 提供基础 CRUD。
 */
@Mapper
public interface CinemaMapper extends BaseMapper<Cinema> {
}