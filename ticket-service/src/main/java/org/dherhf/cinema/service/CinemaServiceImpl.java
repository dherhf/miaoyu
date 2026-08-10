package org.dherhf.cinema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.entity.Hall;
import org.dherhf.cinema.enums.CinemaStatus;
import org.dherhf.schedule.entity.Schedule;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.cinema.dto.CinemaCreateDTO;
import org.dherhf.cinema.dto.CinemaUpdateDTO;
import org.dherhf.cinema.vo.CinemaListVO;
import org.dherhf.cinema.vo.CinemaUserListVO;
import org.dherhf.cinema.vo.CinemaVO;
import org.springframework.beans.BeanUtils;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 影院服务实现类,实现 {@link CinemaService} 接口。
 * <p>
 * 提供影院的增删改查业务逻辑,包括名称唯一性校验、状态管理、
 * 用户端列表的 Redis 缓存、经纬度距离计算与排序等功能。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CinemaServiceImpl implements CinemaService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);
    private static final String CACHE_LIST_OPEN = "cinema:list:open";
    private static final String CACHE_DETAIL_PREFIX = "cinema:detail:";

    private final CinemaMapper cinemaMapper;
    private final ScheduleMapper scheduleMapper;
    private final HallMapper hallMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 新增影院。
     * <p>
     * 先校验影院名称唯一性,然后创建影院实体并设置初始状态为营业,
     * 写入数据库后清除影院列表缓存。
     *
     * @param dto 影院创建请求,包含名称、地址、经纬度、设施等信息
     * @return 新创建的影院信息
     * @throws BusinessException 影院名称已存在时抛出 409
     */
    @Override
    public CinemaVO createCinema(CinemaCreateDTO dto) {
        Long existCount = cinemaMapper.selectCount(
                new LambdaQueryWrapper<Cinema>().eq(Cinema::getName, dto.getName()));
        if (existCount > 0) {
            throw new BusinessException(409, "影院名称已存在");
        }

        Cinema cinema = new Cinema();
        BeanUtils.copyProperties(dto, cinema);
        cinema.setStatus(CinemaStatus.OPEN.getCode());
        cinemaMapper.insert(cinema);

        invalidateCinemaCache(null);
        return toVO(cinema);
    }

    /**
     * 更新影院信息。
     * <p>
     * 先校验影院是否存在,若名称变更则校验新名称唯一性,
     * 然后更新数据库记录并清除缓存。
     *
     * @param id  影院 ID
     * @param dto 影院更新请求
     * @return 更新后的影院信息
     * @throws BusinessException 影院不存在时抛出 404,名称已存在时抛出 409
     */
    @Override
    public CinemaVO updateCinema(Long id, CinemaUpdateDTO dto) {
        Cinema cinema = cinemaMapper.selectById(id);
        if (cinema == null) {
            throw new BusinessException(404, "影院不存在");
        }

        if (!cinema.getName().equals(dto.getName())) {
            Long existCount = cinemaMapper.selectCount(
                    new LambdaQueryWrapper<Cinema>()
                            .eq(Cinema::getName, dto.getName())
                            .ne(Cinema::getId, id));
            if (existCount > 0) {
                throw new BusinessException(409, "影院名称已存在");
            }
        }

        BeanUtils.copyProperties(dto, cinema);
        cinemaMapper.updateById(cinema);

        Cinema updated = cinemaMapper.selectById(id);
        invalidateCinemaCache(id);
        return toVO(updated);
    }

    /**
     * 影院停业,将影院状态置为停业。
     * <p>
     * 若影院已是停业状态则直接返回,否则更新状态并清除缓存。
     *
     * @param id 影院 ID
     * @throws BusinessException 影院不存在时抛出 404
     */
    @Override
    public void closeCinema(Long id) {
        Cinema cinema = cinemaMapper.selectById(id);
        if (cinema == null) {
            throw new BusinessException(404, "影院不存在");
        }
        if (cinema.getStatus() == CinemaStatus.CLOSED.getCode()) {
            return;
        }
        cinema.setStatus(CinemaStatus.CLOSED.getCode());
        cinemaMapper.updateById(cinema);
        invalidateCinemaCache(id);
    }

    /**
     * 影院营业,将影院状态置为营业。
     *
     * @param id 影院 ID
     * @throws BusinessException 影院不存在时抛出 404,已营业时抛出 409
     */
    @Override
    public void openCinema(Long id) {
        Cinema cinema = cinemaMapper.selectById(id);
        if (cinema == null) {
            throw new BusinessException(404, "影院不存在");
        }
        if (cinema.getStatus() == CinemaStatus.OPEN.getCode()) {
            throw new BusinessException(409, "影院已营业");
        }
        cinema.setStatus(CinemaStatus.OPEN.getCode());
        cinemaMapper.updateById(cinema);
        invalidateCinemaCache(id);
    }

    /**
     * 分页查询影院列表（管理端）。
     * <p>
     * 构建动态条件（关键词模糊匹配名称、状态筛选）,按创建时间倒序分页查询。
     *
     * @param keyword 搜索关键词,模糊匹配影院名称（可选）
     * @param status  影院状态筛选（可选）
     * @param page    页码
     * @param size    每页条数
     * @return 分页影院列表（管理端视图）
     */
    @Override
    public PageResult<CinemaListVO> adminList(String keyword, Integer status, Integer page, Integer size) {
        Page<Cinema> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Cinema> wrapper = new LambdaQueryWrapper<Cinema>()
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Cinema::getName, keyword))
                .eq(status != null, Cinema::getStatus, status)
                .orderByDesc(Cinema::getCreatedAt);

        IPage<Cinema> result = cinemaMapper.selectPage(pageParam, wrapper);
        List<CinemaListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    /**
     * 查询影院详情（管理端）,不做状态过滤。
     *
     * @param id 影院 ID
     * @return 影院详细信息
     * @throws BusinessException 影院不存在时抛出 404
     */
    @Override
    public CinemaVO adminDetail(Long id) {
        Cinema cinema = cinemaMapper.selectById(id);
        if (cinema == null) {
            throw new BusinessException(404, "影院不存在");
        }
        return toVO(cinema);
    }

    /**
     * 分页查询影院列表（用户端）。
     * <p>
     * 仅返回营业中的影院,支持按经纬度距离排序、按影片筛选及关键词模糊搜索。
     * 无筛选条件时优先读取 Redis 缓存的全量列表;查询结果按需写入缓存（TTL 5 分钟）。
     * 有经纬度时按距离升序排列,否则按评分降序排列。
     *
     * @param longitude 用户经度（可选）
     * @param latitude  用户纬度（可选）
     * @param movieId   影片 ID,筛选有该影片排片的影院（可选）
     * @param keyword   搜索关键词,模糊匹配影院名称（可选）
     * @param page      页码
     * @param size      每页条数
     * @return 分页影院列表（用户端视图）
     */
    @Override
    public PageResult<CinemaUserListVO> userList(BigDecimal longitude, BigDecimal latitude, Long movieId, String keyword, Integer page, Integer size) {
        // Redis 列表缓存：仅缓存营业中影院全量列表（不带经纬度/影片ID/关键词筛选时）
        boolean cacheable = (longitude == null && latitude == null && movieId == null && (keyword == null || keyword.isBlank()) && page == 1 && size >= 100);
        if (cacheable) {
            String json = redisTemplate.opsForValue().get(CACHE_LIST_OPEN);
            if (json != null) {
                try {
                    List<CinemaUserListVO> cached = objectMapper.readValue(json,
                            objectMapper.getTypeFactory().constructCollectionType(List.class, CinemaUserListVO.class));
                    return new PageResult<>((long) cached.size(), page, size, cached);
                } catch (Exception e) {
                    log.warn("Failed to read cinema list cache: {}", e.getMessage());
                }
            }
        }

        LambdaQueryWrapper<Cinema> wrapper = new LambdaQueryWrapper<Cinema>()
                .eq(Cinema::getStatus, CinemaStatus.OPEN.getCode())
                .and(keyword != null && !keyword.isBlank(), w -> w.like(Cinema::getName, keyword));

        List<Cinema> cinemas = cinemaMapper.selectList(wrapper);

        if (movieId != null) {
            List<Long> cinemaIds = scheduleMapper.selectList(
                            new LambdaQueryWrapper<Schedule>().eq(Schedule::getMovieId, movieId))
                    .stream()
                    .map(Schedule::getCinemaId)
                    .distinct()
                    .toList();
            cinemas = cinemas.stream()
                    .filter(c -> cinemaIds.contains(c.getId()))
                    .toList();
        }

        List<CinemaUserListVO> voList = cinemas.stream()
                .map(this::toUserListVO)
                .collect(Collectors.toList());

        if (longitude != null && latitude != null) {
            voList.forEach(vo -> vo.setDistance(
                    calculateDistance(latitude, longitude, vo.getLatitude(), vo.getLongitude())));
            voList.sort(Comparator.comparing(CinemaUserListVO::getDistance, Comparator.nullsLast(Comparator.naturalOrder())));
        } else {
            voList.sort(Comparator.comparing(CinemaUserListVO::getRating, Comparator.nullsLast(Comparator.reverseOrder())));
        }

        int total = voList.size();
        int fromIndex = Math.min((page - 1) * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<CinemaUserListVO> pageRecords = voList.subList(fromIndex, toIndex);

        // 回写缓存
        if (cacheable) {
            try {
                redisTemplate.opsForValue().set(CACHE_LIST_OPEN, objectMapper.writeValueAsString(voList), CACHE_TTL);
            } catch (Exception e) {
                log.warn("Failed to write cinema list cache: {}", e.getMessage());
            }
        }

        return new PageResult<>((long) total, page, size, pageRecords);
    }

    /**
     * 查询影院详情（用户端）,仅返回营业中的影院。
     *
     * @param id 影院 ID
     * @return 影院详细信息
     * @throws BusinessException 影院不存在或已停业时抛出 404
     */
    @Override
    public CinemaVO userDetail(Long id) {
        Cinema cinema = cinemaMapper.selectById(id);
        if (cinema == null || cinema.getStatus() != CinemaStatus.OPEN.getCode()) {
            throw new BusinessException(404, "影院不存在");
        }
        return toVO(cinema);
    }

        /**
     * 使用 Haversine 公式计算两个经纬度坐标之间的球面距离。
     *
     * @param lat1 起点纬度
     * @param lng1 起点经度
     * @param lat2 终点纬度
     * @param lng2 终点经度
     * @return 距离,单位为米,四舍五入取整
     */
    private long calculateDistance(BigDecimal lat1, BigDecimal lng1, BigDecimal lat2, BigDecimal lng2) {
        double R = 6371000; // Earth radius in meters
        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLng = Math.toRadians(lng2.doubleValue() - lng1.doubleValue());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1.doubleValue())) * Math.cos(Math.toRadians(lat2.doubleValue())) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

        /**
     * 将影院实体转换为影院视图对象。
     *
     * @param cinema 影院实体
     * @return 影院视图对象
     */
    private CinemaVO toVO(Cinema cinema) {
        CinemaVO vo = new CinemaVO();
        BeanUtils.copyProperties(cinema, vo);
        return vo;
    }

        /**
     * 将影院实体转换为管理端列表视图对象,附带影厅数量。
     *
     * @param cinema 影院实体
     * @return 管理端列表视图对象
     */
    private CinemaListVO toListVO(Cinema cinema) {
        CinemaListVO vo = new CinemaListVO();
        BeanUtils.copyProperties(cinema, vo);
        Long hallCount = hallMapper.selectCount(
                new LambdaQueryWrapper<Hall>().eq(Hall::getCinemaId, cinema.getId()));
        vo.setHallCount(hallCount.intValue());
        return vo;
    }

        /**
     * 将影院实体转换为用户端列表视图对象。
     *
     * @param cinema 影院实体
     * @return 用户端列表视图对象
     */
    private CinemaUserListVO toUserListVO(Cinema cinema) {
        CinemaUserListVO vo = new CinemaUserListVO();
        BeanUtils.copyProperties(cinema, vo);
        return vo;
    }

        /**
     * 清除影院相关 Redis 缓存。
     * <p>
     * 删除全量列表缓存键；若传入影院 ID,同时删除该影院的详情缓存键。
     *
     * @param cinemaId 影院 ID,为 null 时仅清除列表缓存
     */
    private void invalidateCinemaCache(Long cinemaId) {
        try {
            redisTemplate.delete(CACHE_LIST_OPEN);
            if (cinemaId != null) {
                redisTemplate.delete(CACHE_DETAIL_PREFIX + cinemaId);
            }
        } catch (Exception e) {
            log.warn("Failed to invalidate cinema cache: {}", e.getMessage());
        }
    }
}
