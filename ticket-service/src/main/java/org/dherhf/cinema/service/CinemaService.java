package org.dherhf.cinema.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.dto.CinemaCreateDTO;
import org.dherhf.cinema.dto.CinemaUpdateDTO;
import org.dherhf.cinema.vo.CinemaListVO;
import org.dherhf.cinema.vo.CinemaUserListVO;
import org.dherhf.cinema.vo.CinemaVO;

import java.math.BigDecimal;

public interface CinemaService {

    CinemaVO createCinema(CinemaCreateDTO dto);

    CinemaVO updateCinema(Long id, CinemaUpdateDTO dto);

    void closeCinema(Long id);

    void openCinema(Long id);

    PageResult<CinemaListVO> adminList(String keyword, Integer status, Integer page, Integer size);

    CinemaVO adminDetail(Long id);

    PageResult<CinemaUserListVO> userList(BigDecimal longitude, BigDecimal latitude, Long movieId, String keyword, Integer page, Integer size);

    CinemaVO userDetail(Long id);
}
