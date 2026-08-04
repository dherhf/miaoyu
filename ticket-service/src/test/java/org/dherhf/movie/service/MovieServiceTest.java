package org.dherhf.movie.service;

import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.util.OssUtil;
import org.dherhf.movie.entity.Movie;
import org.dherhf.movie.mapper.MovieMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.movie.dto.MovieCreateDTO;
import org.dherhf.movie.dto.MovieUpdateDTO;
import org.dherhf.movie.vo.MovieVO;
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
    @Mock
    private OssUtil ossUtil;

    @InjectMocks
    private MovieServiceImpl movieService;

    private MovieCreateDTO createDTO;

    @BeforeEach
    void setUp() {
        createDTO = MovieCreateDTO.builder()
                .name("流浪地球3")
                .types(List.of("科幻", "动作"))
                .posterUrl("https://example.com/poster.jpg")
                .rating(new BigDecimal("9.2"))
                .duration(173)
                .releaseDate(LocalDate.of(2026, 1, 29))
                .build();
    }

    @Test
    void createMovie_success() {
        System.out.println("[MovieServiceTest] ▶ createMovie_success");
        when(movieMapper.selectCount(any())).thenReturn(0L);
        when(movieMapper.insert(any(Movie.class))).thenReturn(1);

        MovieVO result = movieService.createMovie(createDTO);

        assertEquals("流浪地球3", result.getName());
        assertEquals(0, result.getStatus());
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
        Movie movie = Movie.builder()
                .id(1L)
                .status(0)
                .build();
        when(movieMapper.selectById(1L)).thenReturn(movie);
        when(movieMapper.updateById(any(Movie.class))).thenReturn(1);

        movieService.publishMovie(1L);

        verify(movieMapper).updateById(any(Movie.class));
        System.out.println("[MovieServiceTest] ✓ publishMovie_success PASSED");
    }

    @Test
    void publishMovie_alreadyPublished_noOp() {
        System.out.println("[MovieServiceTest] ▶ publishMovie_alreadyPublished_noOp");
        Movie movie = Movie.builder()
                .id(1L)
                .status(1)
                .build();
        when(movieMapper.selectById(1L)).thenReturn(movie);

        movieService.publishMovie(1L);

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
        Movie movie = Movie.builder()
                .id(1L)
                .status(1)
                .build();
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
        Movie movie = Movie.builder()
                .id(1L)
                .status(1)
                .build();
        when(movieMapper.selectById(1L)).thenReturn(movie);
        when(scheduleMapper.selectCount(any())).thenReturn(0L);
        when(movieMapper.updateById(any(Movie.class))).thenReturn(1);

        movieService.unpublishMovie(1L);

        verify(movieMapper).updateById(any(Movie.class));
        System.out.println("[MovieServiceTest] ✓ unpublishMovie_noActiveSchedules_success PASSED");
    }

    @Test
    void updateMovie_notFound_throws404() {
        System.out.println("[MovieServiceTest] ▶ updateMovie_notFound_throws404");
        when(movieMapper.selectById(1L)).thenReturn(null);

        MovieUpdateDTO dto = MovieUpdateDTO.builder()
                .name("test")
                .types(List.of("action"))
                .posterUrl("url")
                .rating(BigDecimal.TEN)
                .duration(120)
                .releaseDate(LocalDate.now())
                .build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> movieService.updateMovie(1L, dto));
        assertEquals(404, ex.getCode());
        System.out.println("[MovieServiceTest] ✓ updateMovie_notFound_throws404 PASSED");
    }

    @Test
    void userDetail_notPublished_throws404() {
        System.out.println("[MovieServiceTest] ▶ userDetail_notPublished_throws404");
        Movie movie = Movie.builder()
                .id(1L)
                .status(0)
                .build();
        when(movieMapper.selectById(1L)).thenReturn(movie);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> movieService.userDetail(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[MovieServiceTest] ✓ userDetail_notPublished_throws404 PASSED");
    }

    @Test
    void userDetail_published_success() {
        System.out.println("[MovieServiceTest] ▶ userDetail_published_success");
        Movie movie = Movie.builder()
                .id(1L)
                .status(1)
                .name("测试影片")
                .build();
        when(movieMapper.selectById(1L)).thenReturn(movie);

        MovieVO result = movieService.userDetail(1L);

        assertEquals("测试影片", result.getName());
        System.out.println("[MovieServiceTest] ✓ userDetail_published_success PASSED");
    }
}
