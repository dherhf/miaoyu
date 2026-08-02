package org.dherhf.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.BusinessException;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.entity.Movie;
import org.dherhf.entity.Schedule;
import org.dherhf.mapper.MovieMapper;
import org.dherhf.mapper.ScheduleMapper;
import org.dherhf.dto.BatchIdsDTO;
import org.dherhf.dto.MovieCreateDTO;
import org.dherhf.dto.MovieUpdateDTO;
import org.dherhf.vo.BatchOperateVO;
import org.dherhf.vo.MovieListVO;
import org.dherhf.vo.MovieVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieServiceImpl implements MovieService {

    private final MovieMapper movieMapper;
    private final ScheduleMapper scheduleMapper;

    @Override
    public Result<MovieVO> createMovie(MovieCreateDTO dto) {
        Long existCount = movieMapper.selectCount(
                new LambdaQueryWrapper<Movie>().eq(Movie::getName, dto.getName()));
        if (existCount > 0) {
            throw new BusinessException(409, "影片名称已存在");
        }

        Movie movie = new Movie();
        BeanUtils.copyProperties(dto, movie);
        movie.setStatus(0);
        movieMapper.insert(movie);

        return Result.success(toVO(movie));
    }

    @Override
    public Result<MovieVO> updateMovie(Long id, MovieUpdateDTO dto) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }

        if (!movie.getName().equals(dto.getName())) {
            Long existCount = movieMapper.selectCount(
                    new LambdaQueryWrapper<Movie>()
                            .eq(Movie::getName, dto.getName())
                            .ne(Movie::getId, id));
            if (existCount > 0) {
                throw new BusinessException(409, "影片名称已存在");
            }
        }

        BeanUtils.copyProperties(dto, movie);
        movieMapper.updateById(movie);

        Movie updated = movieMapper.selectById(id);
        return Result.success(toVO(updated));
    }

    @Override
    public Result<Void> publishMovie(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        if (movie.getStatus() == 1) {
            return Result.success();
        }
        movie.setStatus(1);
        movieMapper.updateById(movie);
        return Result.success();
    }

    @Override
    public Result<Void> unpublishMovie(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        if (movie.getStatus() == 0) {
            return Result.success();
        }

        Long activeScheduleCount = scheduleMapper.selectCount(
                new LambdaQueryWrapper<Schedule>()
                        .eq(Schedule::getMovieId, id)
                        .eq(Schedule::getStatus, "onsale")
                        .ge(Schedule::getShowDate, LocalDate.now()));
        if (activeScheduleCount > 0) {
            throw new BusinessException(409, "影片存在未放映场次，无法下架");
        }

        movie.setStatus(0);
        movieMapper.updateById(movie);
        return Result.success();
    }

    @Override
    public Result<BatchOperateVO> batchPublish(BatchIdsDTO dto) {
        BatchOperateVO result = new BatchOperateVO();
        for (Long id : dto.getIds()) {
            try {
                publishMovie(id);
                result.getSuccessIds().add(id);
            } catch (BusinessException e) {
                result.getFailIds().add(id);
                result.getFailReasons().put(id.toString(), e.getMessage());
            }
        }
        return Result.success(result);
    }

    @Override
    public Result<BatchOperateVO> batchUnpublish(BatchIdsDTO dto) {
        BatchOperateVO result = new BatchOperateVO();
        for (Long id : dto.getIds()) {
            try {
                unpublishMovie(id);
                result.getSuccessIds().add(id);
            } catch (BusinessException e) {
                result.getFailIds().add(id);
                result.getFailReasons().put(id.toString(), e.getMessage());
            }
        }
        return Result.success(result);
    }

    @Override
    public Result<PageResult<MovieListVO>> adminList(String keyword, String type, Integer status, Integer page, Integer size, String sort) {
        Page<Movie> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Movie> wrapper = new LambdaQueryWrapper<Movie>()
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Movie::getName, keyword))
                .eq(status != null, Movie::getStatus, status);

        if ("rating_desc".equals(sort)) {
            wrapper.orderByDesc(Movie::getRating);
        } else {
            wrapper.orderByDesc(Movie::getReleaseDate);
        }

        IPage<Movie> result = movieMapper.selectPage(pageParam, wrapper);
        List<MovieListVO> records = result.getRecords().stream()
                .filter(m -> type == null || type.isBlank() || (m.getTypes() != null && m.getTypes().contains(type)))
                .map(this::toListVO)
                .collect(Collectors.toList());

        return Result.success(new PageResult<>(result.getTotal(), page, size, records));
    }

    @Override
    public Result<MovieVO> adminDetail(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        return Result.success(toVO(movie));
    }

    @Override
    public Result<PageResult<MovieListVO>> userList(String keyword, String type, Integer page, Integer size, String sort) {
        Page<Movie> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Movie> wrapper = new LambdaQueryWrapper<Movie>()
                .eq(Movie::getStatus, 1)
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Movie::getName, keyword));

        if ("rating_desc".equals(sort)) {
            wrapper.orderByDesc(Movie::getRating);
        } else {
            wrapper.orderByDesc(Movie::getReleaseDate);
        }

        IPage<Movie> result = movieMapper.selectPage(pageParam, wrapper);
        List<MovieListVO> records = result.getRecords().stream()
                .filter(m -> type == null || type.isBlank() || (m.getTypes() != null && m.getTypes().contains(type)))
                .map(this::toListVO)
                .collect(Collectors.toList());

        return Result.success(new PageResult<>(result.getTotal(), page, size, records));
    }

    @Override
    public Result<MovieVO> userDetail(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null || movie.getStatus() != 1) {
            throw new BusinessException(404, "影片不存在");
        }
        return Result.success(toVO(movie));
    }

    private MovieVO toVO(Movie movie) {
        MovieVO vo = new MovieVO();
        BeanUtils.copyProperties(movie, vo);
        return vo;
    }

    private MovieListVO toListVO(Movie movie) {
        MovieListVO vo = new MovieListVO();
        BeanUtils.copyProperties(movie, vo);
        return vo;
    }
}
