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

/**
 * 影片服务实现类。
 * <p>
 * 实现影片的增删改查、上下架、批量操作等核心业务逻辑。
 * 管理端可操作所有状态影片，用户端仅展示已上架且有在售场次的影片。
 * 海报图片通过 OSS 私有 Bucket 存储，读取时动态生成签名 URL。
 */
@Service
@RequiredArgsConstructor
public class MovieServiceImpl implements MovieService {

    private final MovieMapper movieMapper;
    private final ScheduleMapper scheduleMapper;
    private final OssUtil ossUtil;

    /**
     * 新增影片，创建后默认为下架状态。
     * <p>
     * 先校验影片名称是否重复，再复制 DTO 属性到实体并插入数据库。
     *
     * @param dto 影片创建参数
     * @return 创建后的影片详情（含签名海报 URL）
     */
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

    /**
     * 编辑影片信息。
     * <p>
     * 校验影片存在性及名称唯一性（排除自身），处理海报 objectKey 更新逻辑：
     * 仅当前端传入的 posterUrl 非 http 开头（即新的 objectKey）时才更新。
     *
     * @param id  影片 ID
     * @param dto 影片更新参数
     * @return 更新后的影片详情
     */
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

    /**
     * 上架影片。
     * <p>
     * 若影片已是上架状态则直接返回，否则将状态更新为上架。
     *
     * @param id 影片 ID
     */
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

    /**
     * 下架影片。
     * <p>
     * 校验影片存在性和当前状态，若存在未放映的在售场次则拒绝下架。
     *
     * @param id 影片 ID
     */
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

    /**
     * 批量上架影片，逐个调用 {@link #publishMovie}，记录成功和失败的 ID。
     *
     * @param dto 包含影片 ID 列表的请求体
     * @return 批量操作结果（成功 ID 列表、失败 ID 列表及失败原因映射）
     */
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

    /**
     * 批量下架影片，逐个调用 {@link #unpublishMovie}，记录成功和失败的 ID。
     *
     * @param dto 包含影片 ID 列表的请求体
     * @return 批量操作结果（成功 ID 列表、失败 ID 列表及失败原因映射）
     */
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

    /**
     * 管理端影片列表查询，可查看所有状态影片。
     * <p>
     * 支持按关键词模糊搜索、状态筛选，再委托 {@link #queryAndPaged} 执行类型过滤和分页排序。
     *
     * @param keyword 搜索关键词
     * @param type    影片类型
     * @param status  影片状态
     * @param page    页码
     * @param size    每页条数
     * @param sort    排序字段
     * @return 分页影片列表
     */
    @Override
    public PageResult<MovieListVO> adminList(String keyword, String type, Integer status, Integer page, Integer size, String sort) {
        LambdaQueryWrapper<Movie> wrapper = new LambdaQueryWrapper<Movie>()
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Movie::getName, keyword))
                .eq(status != null, Movie::getStatus, status);

        return queryAndPaged(wrapper, type, page, size, sort);
    }

    /**
     * 管理端影片详情查询，不限制影片状态。
     *
     * @param id 影片 ID
     * @return 影片详情
     */
    @Override
    public MovieVO adminDetail(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null) {
            throw new BusinessException(404, "影片不存在");
        }
        return toVO(movie);
    }

    /**
     * 用户端影片列表查询，仅返回已上架且有在售场次的影片。
     * <p>
     * 先查询有在售场次的 movieId 集合（可按影院和日期过滤），
     * 再在这些影片中筛选已上架的，支持关键词搜索和类型过滤。
     *
     * @param keyword  搜索关键词
     * @param type     影片类型
     * @param cinemaId 影院 ID
     * @param date     日期
     * @param page     页码
     * @param size     每页条数
     * @param sort     排序字段
     * @return 分页影片列表
     */
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

    /**
     * 用户端影片详情查询，仅返回已上架影片。
     *
     * @param id 影片 ID
     * @return 影片详情
     */
    @Override
    public MovieVO userDetail(Long id) {
        Movie movie = movieMapper.selectById(id);
        if (movie == null || movie.getStatus() != MovieStatus.ONLINE.getCode()) {
            throw new BusinessException(404, "影片不存在");
        }
        return toVO(movie);
    }

    /**
     * 将影片实体转换为详情 VO，并为海报 URL 生成 OSS 签名链接。
     *
     * @param movie 影片实体
     * @return 影片详情 VO（含签名海报 URL）
     */
    private MovieVO toVO(Movie movie) {
        MovieVO vo = new MovieVO();
        BeanUtils.copyProperties(movie, vo);
        vo.setPosterUrl(ossUtil.generateSignedUrl(movie.getPosterUrl(), 3600));
        return vo;
    }

    /**
     * 将影片实体转换为列表 VO，并为海报 URL 生成 OSS 签名链接。
     *
     * @param movie 影片实体
     * @return 影片列表 VO（含签名海报 URL）
     */
    private MovieListVO toListVO(Movie movie) {
        MovieListVO vo = new MovieListVO();
        BeanUtils.copyProperties(movie, vo);
        vo.setPosterUrl(ossUtil.generateSignedUrl(movie.getPosterUrl(), 3600));
        return vo;
    }

    /**
     * 执行类型过滤、排序和分页查询的通用方法。
     * <p>
     * 按影片类型通过 JSON_CONTAINS 过滤，按评分或上映日期排序，分页查询后转换为列表 VO。
     *
     * @param wrapper 已构建好的查询条件
     * @param type    影片类型（可为空）
     * @param page    页码
     * @param size    每页条数
     * @param sort    排序字段（rating_desc 按评分降序，默认按上映日期降序）
     * @return 分页影片列表
     */
    private PageResult<MovieListVO> queryAndPaged(LambdaQueryWrapper<Movie> wrapper, String type, Integer page, Integer size, String sort) {
        if (type != null && !type.isBlank()) {
            wrapper.apply("JSON_CONTAINS(types, JSON_QUOTE({0}))", type);
        }
        if ("rating_desc".equals(sort)) {
            wrapper.orderByDesc(Movie::getRating);
        } else {
            wrapper.orderByDesc(Movie::getReleaseDate);
        }

        IPage<Movie> result = movieMapper.selectPage(new Page<>(page, size), wrapper);
        List<MovieListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }
}
