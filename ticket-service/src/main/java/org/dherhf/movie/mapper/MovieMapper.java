package org.dherhf.movie.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.movie.entity.Movie;

/**
 * 影片 Mapper 接口，继承 MyBatis-Plus BaseMapper，提供影片的 CRUD 数据库操作。
 */
@Mapper
public interface MovieMapper extends BaseMapper<Movie> {
}
