package org.dherhf.movie.service;

import org.dherhf.common.exception.BusinessException;
import org.dherhf.movie.entity.Movie;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.movie.dto.MovieCreateDTO;
import org.dherhf.movie.dto.MovieUpdateDTO;
import org.dherhf.movie.service.MovieServiceImpl;
import org.dherhf.movie.vo.MovieVO;
import org.dherhf.common.result.Result;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MovieServiceTest {

    @Mock
    private MovieMapper movieMapper;
    @Mock
    private ScheduleMapper scheduleMapper;

    @InjectMocks
    private MovieServiceImpl movieService;

    private MovieCreateDTO createDTO;

    @BeforeEach
    void setUp() {
        createDTO = new MovieCreateDTO();
        createDTO.setName("流浪地球3");
        createDTO.setTypes(List.of("科幻", "动作"));
        createDTO.setPosterUrl("https://example.com/poster.jpg");
        createDTO.setRating(new BigDecimal("9.2"));
        createDTO.setDuration(173);
        createDTO.setReleaseDate(LocalDate.of(2026, 1, 29));
    }

    @Test
    void createMovie_success() {
        System.out.println("[MovieServiceTest] ▶ createMovie_success");
        when(movieMapper.selectCount(any())).thenReturn(0L);
        when(movieMapper.insert(any(Movie.class))).thenReturn(1);

        Result<MovieVO> result = movieService.createMovie(createDTO);

        assertEquals(0, result.getCode());
        assertEquals("流浪地球3", result.getData().getName());
        assertEquals(0, result.getData().getStatus());
        verify(movieMapper).insert(any(Movie.class));
        System.out.println("[MovieServiceTest] ✓ createMovie_success PASSED");
    }

    @Test
    void createMovie_duplicateName_throws409() {
        System.out.println("[MovieServiceTest] ▶ createMovie_duplicateName_throws409");
        when(movieMapper.selectCount(any())).thenReturn(1L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> movieService.createMovie(createDTO));
        assertEquals(409, ex.getCode());
        System.out.println("[MovieServiceTest] ✓ createMovie_duplicateName_throws409 PASSED");
    }

    @Test
    void publishMovie_success() {
        System.out.println("[MovieServiceTest] ▶ publishMovie_success");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(0);
        when(movieMapper.selectById(1L)).thenReturn(movie);
        when(movieMapper.updateById(any(Movie.class))).thenReturn(1);

        Result<Void> result = movieService.publishMovie(1L);

        assertEquals(0, result.getCode());
        verify(movieMapper).updateById(any(Movie.class));
        System.out.println("[MovieServiceTest] ✓ publishMovie_success PASSED");
    }

    @Test
    void publishMovie_alreadyPublished_noOp() {
        System.out.println("[MovieServiceTest] ▶ publishMovie_alreadyPublished_noOp");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(1);
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Result<Void> result = movieService.publishMovie(1L);

        assertEquals(0, result.getCode());
        verify(movieMapper, never()).updateById(any(Movie.class));
        System.out.println("[MovieServiceTest] ✓ publishMovie_alreadyPublished_noOp PASSED");
    }

    @Test
    void publishMovie_notFound_throws404() {
        System.out.println("[MovieServiceTest] ▶ publishMovie_notFound_throws404");
        when(movieMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> movieService.publishMovie(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[MovieServiceTest] ✓ publishMovie_notFound_throws404 PASSED");
    }

    @Test
    void unpublishMovie_hasActiveSchedules_throws409() {
        System.out.println("[MovieServiceTest] ▶ unpublishMovie_hasActiveSchedules_throws409");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(1);
        when(movieMapper.selectById(1L)).thenReturn(movie);
        when(scheduleMapper.selectCount(any())).thenReturn(3L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> movieService.unpublishMovie(1L));
        assertEquals(409, ex.getCode());
        System.out.println("[MovieServiceTest] ✓ unpublishMovie_hasActiveSchedules_throws409 PASSED");
    }

    @Test
    void unpublishMovie_noActiveSchedules_success() {
        System.out.println("[MovieServiceTest] ▶ unpublishMovie_noActiveSchedules_success");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(1);
        when(movieMapper.selectById(1L)).thenReturn(movie);
        when(scheduleMapper.selectCount(any())).thenReturn(0L);
        when(movieMapper.updateById(any(Movie.class))).thenReturn(1);

        Result<Void> result = movieService.unpublishMovie(1L);

        assertEquals(0, result.getCode());
        verify(movieMapper).updateById(any(Movie.class));
        System.out.println("[MovieServiceTest] ✓ unpublishMovie_noActiveSchedules_success PASSED");
    }

    @Test
    void updateMovie_notFound_throws404() {
        System.out.println("[MovieServiceTest] ▶ updateMovie_notFound_throws404");
        when(movieMapper.selectById(1L)).thenReturn(null);

        MovieUpdateDTO dto = new MovieUpdateDTO();
        dto.setName("test");
        dto.setTypes(List.of("action"));
        dto.setPosterUrl("url");
        dto.setRating(BigDecimal.TEN);
        dto.setDuration(120);
        dto.setReleaseDate(LocalDate.now());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> movieService.updateMovie(1L, dto));
        assertEquals(404, ex.getCode());
        System.out.println("[MovieServiceTest] ✓ updateMovie_notFound_throws404 PASSED");
    }

    @Test
    void userDetail_notPublished_throws404() {
        System.out.println("[MovieServiceTest] ▶ userDetail_notPublished_throws404");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(0);
        when(movieMapper.selectById(1L)).thenReturn(movie);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> movieService.userDetail(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[MovieServiceTest] ✓ userDetail_notPublished_throws404 PASSED");
    }

    @Test
    void userDetail_published_success() {
        System.out.println("[MovieServiceTest] ▶ userDetail_published_success");
        Movie movie = new Movie();
        movie.setId(1L);
        movie.setStatus(1);
        movie.setName("测试影片");
        when(movieMapper.selectById(1L)).thenReturn(movie);

        Result<MovieVO> result = movieService.userDetail(1L);

        assertEquals(0, result.getCode());
        assertEquals("测试影片", result.getData().getName());
        System.out.println("[MovieServiceTest] ✓ userDetail_published_success PASSED");
    }
}
