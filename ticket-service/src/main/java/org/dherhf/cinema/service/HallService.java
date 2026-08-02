package org.dherhf.cinema.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.dto.HallCreateDTO;
import org.dherhf.cinema.dto.HallLayoutDTO;
import org.dherhf.cinema.dto.HallUpdateDTO;
import org.dherhf.cinema.vo.HallDetailVO;
import org.dherhf.cinema.vo.HallListVO;
import org.dherhf.cinema.vo.HallVO;
import org.dherhf.cinema.vo.LayoutResultVO;

public interface HallService {

    HallVO createHall(HallCreateDTO dto);

    PageResult<HallListVO> list(Long cinemaId, String name, String screenType, Integer status, Integer page, Integer size);

    HallDetailVO detail(Long id);

    HallVO updateHall(Long id, HallUpdateDTO dto);

    LayoutResultVO saveLayout(Long id, HallLayoutDTO dto);
}
