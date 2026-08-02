package org.dherhf.schedule.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.schedule.dto.ScheduleCreateDTO;
import org.dherhf.schedule.dto.ScheduleUpdateDTO;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.ScheduleVO;
import org.dherhf.schedule.vo.SeatMapVO;

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
