package org.dherhf.schedule.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.schedule.dto.ScheduleCreateDTO;
import org.dherhf.schedule.dto.ScheduleUpdateDTO;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.ScheduleVO;
import org.dherhf.schedule.vo.SeatMapVO;

public interface ScheduleService {

    ScheduleVO createSchedule(ScheduleCreateDTO dto);

    ScheduleVO updateSchedule(Long id, ScheduleUpdateDTO dto);

    void cancelSchedule(Long id);

    void restoreSchedule(Long id);

    void endSchedule(Long id);

    PageResult<ScheduleListVO> adminList(Long movieId, Long cinemaId, Long hallId, String showDate, String status, Integer page, Integer size);

    ScheduleDetailVO adminDetail(Long id);

    PageResult<ScheduleListVO> userList(Long movieId, String movieName, Long cinemaId, String showDate, Integer page, Integer size);

    ScheduleDetailVO userDetail(Long id);

    SeatMapVO getSeatMap(Long id);

    void autoEndExpiredSchedules();
}
