package org.dherhf.service;

import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.HallCreateDTO;
import org.dherhf.dto.HallLayoutDTO;
import org.dherhf.dto.HallUpdateDTO;
import org.dherhf.vo.HallDetailVO;
import org.dherhf.vo.HallListVO;
import org.dherhf.vo.HallVO;
import org.dherhf.vo.LayoutResultVO;

public interface HallService {

    Result<HallVO> createHall(HallCreateDTO dto);

    Result<PageResult<HallListVO>> list(Long cinemaId, String name, String screenType, Integer status, Integer page, Integer size);

    Result<HallDetailVO> detail(Long id);

    Result<HallVO> updateHall(Long id, HallUpdateDTO dto);

    Result<LayoutResultVO> saveLayout(Long id, HallLayoutDTO dto);
}
