package org.dherhf.movie.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.order.dto.BatchIdsDTO;
import org.dherhf.movie.dto.MovieCreateDTO;
import org.dherhf.movie.dto.MovieUpdateDTO;
import org.dherhf.order.vo.BatchOperateVO;
import org.dherhf.movie.vo.MovieListVO;
import org.dherhf.movie.vo.MovieVO;

public interface MovieService {

    Result<MovieVO> createMovie(MovieCreateDTO dto);

    Result<MovieVO> updateMovie(Long id, MovieUpdateDTO dto);

    Result<Void> publishMovie(Long id);

    Result<Void> unpublishMovie(Long id);

    Result<BatchOperateVO> batchPublish(BatchIdsDTO dto);

    Result<BatchOperateVO> batchUnpublish(BatchIdsDTO dto);

    Result<PageResult<MovieListVO>> adminList(String keyword, String type, Integer status, Integer page, Integer size, String sort);

    Result<MovieVO> adminDetail(Long id);

    Result<PageResult<MovieListVO>> userList(String keyword, String type, Integer page, Integer size, String sort);

    Result<MovieVO> userDetail(Long id);
}
