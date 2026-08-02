package org.dherhf.cinema.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.cinema.dto.CinemaCreateDTO;
import org.dherhf.cinema.dto.CinemaUpdateDTO;
import org.dherhf.cinema.vo.CinemaListVO;
import org.dherhf.cinema.vo.CinemaUserListVO;
import org.dherhf.cinema.vo.CinemaVO;

import java.math.BigDecimal;

public interface CinemaService {

    Result<CinemaVO> createCinema(CinemaCreateDTO dto);

    Result<CinemaVO> updateCinema(Long id, CinemaUpdateDTO dto);

    Result<Void> closeCinema(Long id);

    Result<Void> openCinema(Long id);

    Result<PageResult<CinemaListVO>> adminList(String keyword, Integer status, Integer page, Integer size);

    Result<CinemaVO> adminDetail(Long id);

    Result<PageResult<CinemaUserListVO>> userList(BigDecimal longitude, BigDecimal latitude, Long movieId, Integer page, Integer size);

    Result<CinemaVO> userDetail(Long id);
}
