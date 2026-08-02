package org.dherhf.movie.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.order.dto.BatchIdsDTO;
import org.dherhf.movie.dto.MovieCreateDTO;
import org.dherhf.movie.dto.MovieUpdateDTO;
import org.dherhf.order.vo.BatchOperateVO;
import org.dherhf.movie.vo.MovieListVO;
import org.dherhf.movie.vo.MovieVO;

public interface MovieService {

    MovieVO createMovie(MovieCreateDTO dto);

    MovieVO updateMovie(Long id, MovieUpdateDTO dto);

    void publishMovie(Long id);

    void unpublishMovie(Long id);

    BatchOperateVO batchPublish(BatchIdsDTO dto);

    BatchOperateVO batchUnpublish(BatchIdsDTO dto);

    PageResult<MovieListVO> adminList(String keyword, String type, Integer status, Integer page, Integer size, String sort);

    MovieVO adminDetail(Long id);

    PageResult<MovieListVO> userList(String keyword, String type, Integer page, Integer size, String sort);

    MovieVO userDetail(Long id);
}
