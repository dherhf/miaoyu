package org.dherhf.schedule.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.schedule.service.ScheduleService;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.SeatMapVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "场次查询(用户端)", description = "用户端场次列表/详情/座位图")
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class UserScheduleController {

    private final ScheduleService scheduleService;

    @Operation(summary = "场次列表(用户端)")
    @GetMapping
    public Result<PageResult<ScheduleListVO>> list(
            @RequestParam(required = false) String movieName,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) String showDate,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return scheduleService.userList(movieName, cinemaId, showDate, page, size);
    }

    @Operation(summary = "场次详情(用户端)")
    @GetMapping("/{id}")
    public Result<ScheduleDetailVO> detail(@PathVariable Long id) {
        return scheduleService.userDetail(id);
    }

    @Operation(summary = "座位图")
    @GetMapping("/{id}/seats")
    public Result<SeatMapVO> seats(@PathVariable Long id) {
        return scheduleService.getSeatMap(id);
    }
}
