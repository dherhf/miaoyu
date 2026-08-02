package org.dherhf.cinema.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.cinema.dto.HallCreateDTO;
import org.dherhf.cinema.dto.HallLayoutDTO;
import org.dherhf.cinema.dto.HallUpdateDTO;
import org.dherhf.cinema.vo.HallDetailVO;
import org.dherhf.cinema.vo.HallListVO;
import org.dherhf.cinema.vo.HallVO;
import org.dherhf.cinema.vo.LayoutResultVO;

public interface HallService {

    Result<HallVO> createHall(HallCreateDTO dto);

    Result<PageResult<HallListVO>> list(Long cinemaId, String name, String screenType, Integer status, Integer page, Integer size);

    Result<HallDetailVO> detail(Long id);

    Result<HallVO> updateHall(Long id, HallUpdateDTO dto);

    Result<LayoutResultVO> saveLayout(Long id, HallLayoutDTO dto);
}
