package org.dherhf.service;

import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.ScheduleCreateDTO;
import org.dherhf.dto.ScheduleUpdateDTO;
import org.dherhf.vo.ScheduleDetailVO;
import org.dherhf.vo.ScheduleListVO;
import org.dherhf.vo.ScheduleVO;
import org.dherhf.vo.SeatMapVO;

public interface ScheduleService {

    Result<ScheduleVO> createSchedule(ScheduleCreateDTO dto);

    Result<ScheduleVO> updateSchedule(Long id, ScheduleUpdateDTO dto);

    Result<Void> cancelSchedule(Long id);

    Result<Void> endSchedule(Long id);

    Result<PageResult<ScheduleListVO>> adminList(Long movieId, Long cinemaId, Long hallId, String showDate, String status, Integer page, Integer size);

    Result<ScheduleDetailVO> adminDetail(Long id);

    Result<PageResult<ScheduleListVO>> userList(String movieName, Long cinemaId, String showDate, Integer page, Integer size);

    Result<ScheduleDetailVO> userDetail(Long id);

    Result<SeatMapVO> getSeatMap(Long id);
}
