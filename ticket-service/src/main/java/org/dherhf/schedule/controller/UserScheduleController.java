package org.dherhf.schedule.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.schedule.service.ScheduleService;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.SeatMapVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 场次查询控制器（用户端）。
 * <p>
 * 提供用户端的场次列表、场次详情和座位图查询接口，
 * 仅返回可售状态的场次。
 */
@Tag(name = "场次查询(用户端)", description = "用户端场次列表/详情/座位图")
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class UserScheduleController {

    private final ScheduleService scheduleService;

    /**
     * 查询用户端场次列表（分页）。
     * <p>
     * 仅返回可售且放映日期不早于当天的场次，支持按影片ID、影片名称、影院ID、放映日期过滤。
     *
     * @param movieId   影片ID，可选过滤条件
     * @param movieName 影片名称（模糊匹配），可选过滤条件
     * @param cinemaId  影院ID，可选过滤条件
     * @param showDate  放映日期字符串，可选过滤条件
     * @param page      页码，从1开始
     * @param size      每页条数
     * @return 分页场次列表结果
     */
    @Operation(summary = "场次列表(用户端)")
    @GetMapping
    public Result<PageResult<ScheduleListVO>> list(
            @Parameter(description = "影片 ID") @RequestParam(required = false) Long movieId,
            @Parameter(description = "影片名称") @RequestParam(required = false) String movieName,
            @Parameter(description = "影院 ID") @RequestParam(required = false) Long cinemaId,
            @Parameter(description = "放映日期") @RequestParam(required = false) String showDate,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(scheduleService.userList(movieId, movieName, cinemaId, showDate, page, size));
    }

    /**
     * 查询用户端场次详情。
     *
     * @param id 场次ID
     * @return 场次详情结果
     */
    @Operation(summary = "场次详情(用户端)")
    @GetMapping("/{id}")
    public Result<ScheduleDetailVO> detail(@Parameter(description = "场次 ID") @PathVariable Long id) {
        return Result.success(scheduleService.userDetail(id));
    }

    /**
     * 查询场次座位图。
     * <p>
     * 返回场次所有座位的排布及状态信息，优先从 Redis Bitmap 读取座位状态，缓存未命中时降级查 MySQL。
     *
     * @param id 场次ID
     * @return 座位图结果
     */
    @Operation(summary = "座位图")
    @GetMapping("/{id}/seats")
    public Result<SeatMapVO> seats(@Parameter(description = "场次 ID") @PathVariable Long id) {
        return Result.success(scheduleService.getSeatMap(id));
    }
}
