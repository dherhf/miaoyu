package org.dherhf.service;

import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.BatchIdsDTO;
import org.dherhf.dto.MovieCreateDTO;
import org.dherhf.dto.MovieUpdateDTO;
import org.dherhf.vo.BatchOperateVO;
import org.dherhf.vo.MovieListVO;
import org.dherhf.vo.MovieVO;

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
