package org.dherhf.movie.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.movie.entity.Movie;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.order.dto.BatchIdsDTO;
import org.dherhf.movie.dto.MovieCreateDTO;
import org.dherhf.movie.dto.MovieUpdateDTO;
import org.dherhf.order.vo.BatchOperateVO;
import org.dherhf.movie.vo.MovieListVO;
import org.dherhf.movie.vo.MovieVO;
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
    public MovieVO createMovie(MovieCreateDTO dto) {
        Long existCount = movieMapper.selectCount(
                new LambdaQueryWrapper<Movie>().eq(Movie::getName, dto.getName()));
        if (existCount > 0) {
            throw new BusinessException(409, "影片名称已存在");
        }

        Movie movie = new Movie();
        BeanUtils.copyProperties(dto, movie);
        movie.setStatus(0);
        movieMapper.insert(movie);

        return toVO(movie);
    }

    @Override
    public MovieVO updateMovie(Long id, MovieUpdateDTO dto) {
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
        return toVO(updated);
    }

    @Override
    public void publishMovie(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        if (movie.getStatus() == 1) {
            return;
        }
        movie.setStatus(1);
        movieMapper.updateById(movie);
    }

    @Override
    public void unpublishMovie(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        if (movie.getStatus() == 0) {
            return;
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
    }

    @Override
    public BatchOperateVO batchPublish(BatchIdsDTO dto) {
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
        return result;
    }

    @Override
    public BatchOperateVO batchUnpublish(BatchIdsDTO dto) {
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
        return result;
    }

    @Override
    public PageResult<MovieListVO> adminList(String keyword, String type, Integer status, Integer page, Integer size, String sort) {
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

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    public MovieVO adminDetail(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        return toVO(movie);
    }

    @Override
    public PageResult<MovieListVO> userList(String keyword, String type, Integer page, Integer size, String sort) {
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

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    public MovieVO userDetail(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null || movie.getStatus() != 1) {
            throw new BusinessException(404, "影片不存在");
        }
        return toVO(movie);
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
