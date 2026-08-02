package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.service.ScheduleService;
import org.dherhf.vo.ScheduleDetailVO;
import org.dherhf.vo.ScheduleListVO;
import org.dherhf.vo.SeatMapVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class UserScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public Result<PageResult<ScheduleListVO>> list(
            @RequestParam(required = false) String movieName,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) String showDate,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return scheduleService.userList(movieName, cinemaId, showDate, page, size);
    }

    @GetMapping("/{id}")
    public Result<ScheduleDetailVO> detail(@PathVariable Long id) {
        return scheduleService.userDetail(id);
    }

    @GetMapping("/{id}/seats")
    public Result<SeatMapVO> seats(@PathVariable Long id) {
        return scheduleService.getSeatMap(id);
    }
}
