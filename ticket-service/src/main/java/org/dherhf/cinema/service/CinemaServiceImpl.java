package org.dherhf.cinema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.util.PageUtil;
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

    @Override
    public PageResult<CinemaListVO> adminList(String keyword, Integer status, Integer page, Integer size) {
        Page<Cinema> pageParam = new Page<>(PageUtil.normalizePage(page), PageUtil.normalizeSize(size));
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

    @Override
    public CinemaVO adminDetail(Long id) {
        Cinema cinema = cinemaMapper.selectById(id);
        if (cinema == null) {
            throw new BusinessException(404, "影院不存在");
        }
        return toVO(cinema);
    }

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

    @Override
    public CinemaVO userDetail(Long id) {
        Cinema cinema = cinemaMapper.selectById(id);
        if (cinema == null || cinema.getStatus() != CinemaStatus.OPEN.getCode()) {
            throw new BusinessException(404, "影院不存在");
        }
        return toVO(cinema);
    }

    private long calculateDistance(BigDecimal lat1, BigDecimal lng1, BigDecimal lat2, BigDecimal lng2) {
        double R = 6371000; // 地球半径
        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLng = Math.toRadians(lng2.doubleValue() - lng1.doubleValue());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1.doubleValue())) * Math.cos(Math.toRadians(lat2.doubleValue())) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    private CinemaVO toVO(Cinema cinema) {
        CinemaVO vo = new CinemaVO();
        BeanUtils.copyProperties(cinema, vo);
        return vo;
    }

    private CinemaListVO toListVO(Cinema cinema) {
        CinemaListVO vo = new CinemaListVO();
        BeanUtils.copyProperties(cinema, vo);
        Long hallCount = hallMapper.selectCount(
                new LambdaQueryWrapper<Hall>().eq(Hall::getCinemaId, cinema.getId()));
        vo.setHallCount(hallCount.intValue());
        return vo;
    }

    private CinemaUserListVO toUserListVO(Cinema cinema) {
        CinemaUserListVO vo = new CinemaUserListVO();
        BeanUtils.copyProperties(cinema, vo);
        return vo;
    }

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
