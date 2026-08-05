package org.dherhf.movie.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.util.OssUtil;
import org.dherhf.movie.entity.Movie;
import org.dherhf.movie.enums.MovieStatus;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.schedule.enums.ScheduleStatus;
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
    private final OssUtil ossUtil;

    @Override
    public MovieVO createMovie(MovieCreateDTO dto) {
        Long existCount = movieMapper.selectCount(
                new LambdaQueryWrapper<Movie>().eq(Movie::getName, dto.getName()));
        if (existCount > 0) {
            throw new BusinessException(409, "影片名称已存在");
        }

        Movie movie = new Movie();
        BeanUtils.copyProperties(dto, movie);
        movie.setStatus(MovieStatus.OFFLINE.getCode());
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

        BeanUtils.copyProperties(dto, movie, "posterUrl");
        // 如果前端传的 posterUrl 是新的 objectKey（非 http 开头），才更新
        if (dto.getPosterUrl() != null && !dto.getPosterUrl().startsWith("http")) {
            movie.setPosterUrl(dto.getPosterUrl());
        }
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
        if (movie.getStatus() == MovieStatus.ONLINE.getCode()) {
            return;
        }
        movie.setStatus(MovieStatus.ONLINE.getCode());
        movieMapper.updateById(movie);
    }

    @Override
    public void unpublishMovie(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        if (movie.getStatus() == MovieStatus.OFFLINE.getCode()) {
            throw new BusinessException(409, "影片已下架");
        }

        Long activeScheduleCount = scheduleMapper.selectCount(
                new LambdaQueryWrapper<Schedule>()
                        .eq(Schedule::getMovieId, id)
                        .eq(Schedule::getStatus, ScheduleStatus.ON_SALE.getCode())
                        .ge(Schedule::getShowDate, LocalDate.now()));
        if (activeScheduleCount > 0) {
            throw new BusinessException(409, "影片存在未放映场次，无法下架");
        }

        movie.setStatus(MovieStatus.OFFLINE.getCode());
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
        LambdaQueryWrapper<Movie> wrapper = new LambdaQueryWrapper<Movie>()
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Movie::getName, keyword))
                .eq(status != null, Movie::getStatus, status);

        return queryAndPaged(wrapper, type, page, size, sort);
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
    public PageResult<MovieListVO> userList(String keyword, String type, Long cinemaId, String date, Integer page, Integer size, String sort) {
        // 查询有在售场次（status=ON_SALE 且 showDate >= today）的 movieId 集合
        // 可按 cinemaId 和 date 进一步过滤
        LambdaQueryWrapper<Schedule> scheduleWrapper = new LambdaQueryWrapper<Schedule>()
                .select(Schedule::getMovieId)
                .eq(Schedule::getStatus, ScheduleStatus.ON_SALE.getCode())
                .ge(Schedule::getShowDate, LocalDate.now())
                .eq(cinemaId != null, Schedule::getCinemaId, cinemaId)
                .eq(date != null && !date.isBlank(), Schedule::getShowDate, date != null ? LocalDate.parse(date) : null);

        List<Long> movieIdsWithSchedules = scheduleMapper.selectList(scheduleWrapper)
                .stream()
                .map(Schedule::getMovieId)
                .distinct()
                .collect(Collectors.toList());

        if (movieIdsWithSchedules.isEmpty()) {
            return new PageResult<>(0L, page, size, List.of());
        }

        LambdaQueryWrapper<Movie> wrapper = new LambdaQueryWrapper<Movie>()
                .eq(Movie::getStatus, MovieStatus.ONLINE.getCode())
                .in(Movie::getId, movieIdsWithSchedules)
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Movie::getName, keyword));

        return queryAndPaged(wrapper, type, page, size, sort);
    }

    @Override
    public MovieVO userDetail(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null || movie.getStatus() != MovieStatus.ONLINE.getCode()) {
            throw new BusinessException(404, "影片不存在");
        }
        return toVO(movie);
    }

    private MovieVO toVO(Movie movie) {
        MovieVO vo = new MovieVO();
        BeanUtils.copyProperties(movie, vo);
        vo.setPosterUrl(ossUtil.generateSignedUrl(movie.getPosterUrl(), 3600));
        return vo;
    }

    private MovieListVO toListVO(Movie movie) {
        MovieListVO vo = new MovieListVO();
        BeanUtils.copyProperties(movie, vo);
        vo.setPosterUrl(ossUtil.generateSignedUrl(movie.getPosterUrl(), 3600));
        return vo;
    }

    private PageResult<MovieListVO> queryAndPaged(LambdaQueryWrapper<Movie> wrapper, String type, Integer page, Integer size, String sort) {
        if ("rating_desc".equals(sort)) {
            wrapper.orderByDesc(Movie::getRating);
        } else {
            wrapper.orderByDesc(Movie::getReleaseDate);
        }

        IPage<Movie> result = movieMapper.selectPage(new Page<>(page, size), wrapper);
        List<MovieListVO> records = result.getRecords().stream()
                .filter(m -> type == null || type.isBlank() || (m.getTypes() != null && m.getTypes().contains(type)))
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }
}
