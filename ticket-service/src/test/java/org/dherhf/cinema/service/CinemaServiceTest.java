package org.dherhf.cinema.service;

import org.dherhf.cinema.service.CinemaServiceImpl;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.cinema.entity.Cinema;
import org.dherhf.cinema.mapper.CinemaMapper;
import org.dherhf.schedule.mapper.ScheduleMapper;
import org.dherhf.cinema.mapper.HallMapper;
import org.dherhf.cinema.dto.CinemaCreateDTO;
import org.dherhf.cinema.vo.CinemaVO;
import org.dherhf.common.result.Result;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CinemaServiceTest {

    @Mock
    private CinemaMapper cinemaMapper;
    @Mock
    private ScheduleMapper scheduleMapper;
    @Mock
    private HallMapper hallMapper;

    @InjectMocks
    private CinemaServiceImpl cinemaService;

    private CinemaCreateDTO createDTO;

    @BeforeEach
    void setUp() {
        createDTO = new CinemaCreateDTO();
        createDTO.setName("万达影城");
        createDTO.setAddress("北京市朝阳区");
        createDTO.setLongitude(new BigDecimal("116.5187200"));
        createDTO.setLatitude(new BigDecimal("39.9257800"));
    }

    @Test
    void createCinema_success() {
        System.out.println("[CinemaServiceTest] ▶ createCinema_success");
        when(cinemaMapper.selectCount(any())).thenReturn(0L);
        when(cinemaMapper.insert(any(Cinema.class))).thenReturn(1);

        Result<CinemaVO> result = cinemaService.createCinema(createDTO);

        assertEquals(0, result.getCode());
        assertEquals("万达影城", result.getData().getName());
        assertEquals(1, result.getData().getStatus());
        System.out.println("[CinemaServiceTest] ✓ createCinema_success PASSED");
    }

    @Test
    void createCinema_duplicateName_throws409() {
        System.out.println("[CinemaServiceTest] ▶ createCinema_duplicateName_throws409");
        when(cinemaMapper.selectCount(any())).thenReturn(1L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> cinemaService.createCinema(createDTO));
        assertEquals(409, ex.getCode());
        System.out.println("[CinemaServiceTest] ✓ createCinema_duplicateName_throws409 PASSED");
    }

    @Test
    void closeCinema_success() {
        System.out.println("[CinemaServiceTest] ▶ closeCinema_success");
        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(1);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);
        when(cinemaMapper.updateById(any(Cinema.class))).thenReturn(1);

        Result<Void> result = cinemaService.closeCinema(1L);

        assertEquals(0, result.getCode());
        verify(cinemaMapper).updateById(any(Cinema.class));
        System.out.println("[CinemaServiceTest] ✓ closeCinema_success PASSED");
    }

    @Test
    void closeCinema_alreadyClosed_noOp() {
        System.out.println("[CinemaServiceTest] ▶ closeCinema_alreadyClosed_noOp");
        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(0);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        Result<Void> result = cinemaService.closeCinema(1L);

        assertEquals(0, result.getCode());
        verify(cinemaMapper, never()).updateById(any(Cinema.class));
        System.out.println("[CinemaServiceTest] ✓ closeCinema_alreadyClosed_noOp PASSED");
    }

    @Test
    void closeCinema_notFound_throws404() {
        System.out.println("[CinemaServiceTest] ▶ closeCinema_notFound_throws404");
        when(cinemaMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> cinemaService.closeCinema(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[CinemaServiceTest] ✓ closeCinema_notFound_throws404 PASSED");
    }

    @Test
    void openCinema_success() {
        System.out.println("[CinemaServiceTest] ▶ openCinema_success");
        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(0);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);
        when(cinemaMapper.updateById(any(Cinema.class))).thenReturn(1);

        Result<Void> result = cinemaService.openCinema(1L);

        assertEquals(0, result.getCode());
        verify(cinemaMapper).updateById(any(Cinema.class));
        System.out.println("[CinemaServiceTest] ✓ openCinema_success PASSED");
    }

    @Test
    void userDetail_closed_throws404() {
        System.out.println("[CinemaServiceTest] ▶ userDetail_closed_throws404");
        Cinema cinema = new Cinema();
        cinema.setId(1L);
        cinema.setStatus(0);
        when(cinemaMapper.selectById(1L)).thenReturn(cinema);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> cinemaService.userDetail(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[CinemaServiceTest] ✓ userDetail_closed_throws404 PASSED");
    }

    @Test
    void userDetail_notFound_throws404() {
        System.out.println("[CinemaServiceTest] ▶ userDetail_notFound_throws404");
        when(cinemaMapper.selectById(1L)).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> cinemaService.userDetail(1L));
        assertEquals(404, ex.getCode());
        System.out.println("[CinemaServiceTest] ✓ userDetail_notFound_throws404 PASSED");
    }
}
