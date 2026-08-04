package org.dherhf.schedule.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.movie.service.MovieService;
import org.dherhf.movie.vo.MovieVO;
import org.dherhf.schedule.service.ScheduleService;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.SeatMapVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "场次内部接口", description = "Agent调用的场次接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalScheduleController {

    private final ScheduleService scheduleService;
    private final MovieService movieService;

    @Operation(summary = "内部场次列表")
    @GetMapping("/sessions")
    public Result<PageResult<ScheduleListVO>> list(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        String movieName = null;
        if (movieId != null) {
            try {
                MovieVO movie = movieService.userDetail(movieId);
                movieName = movie.getName();
            } catch (Exception ignored) {
            }
        }
        return Result.success(scheduleService.userList(movieName, cinemaId, date, page, size));
    }

    @Operation(summary = "内部场次详情")
    @GetMapping("/sessions/{id}")
    public Result<ScheduleDetailVO> detail(@PathVariable Long id) {
        return Result.success(scheduleService.userDetail(id));
    }

    @Operation(summary = "内部座位图")
    @GetMapping("/sessions/{id}/seats")
    public Result<SeatMapVO> seats(@PathVariable Long id) {
        return Result.success(scheduleService.getSeatMap(id));
    }
}
