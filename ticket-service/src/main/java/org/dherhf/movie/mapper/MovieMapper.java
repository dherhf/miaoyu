package org.dherhf.movie.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.movie.entity.Movie;

@Mapper
public interface MovieMapper extends BaseMapper<Movie> {
}
