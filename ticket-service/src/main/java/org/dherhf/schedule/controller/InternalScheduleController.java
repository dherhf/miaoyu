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
 * 场次内部接口控制器。
 * <p>
 * 供 Agent 服务调用的场次查询接口，包括场次列表、详情和座位图，
 * 不需要用户身份认证，仅限内部服务间调用。
 */
@Tag(name = "场次内部接口", description = "Agent调用的场次接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalScheduleController {

    private final ScheduleService scheduleService;

    /**
     * 查询内部场次列表（分页）。
     *
     * @param movieId  影片ID，可选过滤条件
     * @param cinemaId 影院ID，可选过滤条件
     * @param date     放映日期字符串，可选过滤条件
     * @param page     页码，从1开始
     * @param size     每页条数
     * @return 分页场次列表结果
     */
    @Operation(summary = "内部场次列表")
    @GetMapping("/sessions")
    public Result<PageResult<ScheduleListVO>> list(
            @Parameter(description = "影片 ID") @RequestParam(required = false) Long movieId,
            @Parameter(description = "影院 ID") @RequestParam(required = false) Long cinemaId,
            @Parameter(description = "日期") @RequestParam(required = false) String date,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(scheduleService.userList(movieId, null, cinemaId, date, page, size));
    }

    /**
     * 查询内部场次详情。
     *
     * @param id 场次ID
     * @return 场次详情结果
     */
    @Operation(summary = "内部场次详情")
    @GetMapping("/sessions/{id}")
    public Result<ScheduleDetailVO> detail(@Parameter(description = "场次 ID") @PathVariable Long id) {
        return Result.success(scheduleService.userDetail(id));
    }

    /**
     * 查询内部场次座位图。
     *
     * @param id 场次ID
     * @return 座位图结果
     */
    @Operation(summary = "内部座位图")
    @GetMapping("/sessions/{id}/seats")
    public Result<SeatMapVO> seats(@Parameter(description = "场次 ID") @PathVariable Long id) {
        return Result.success(scheduleService.getSeatMap(id));
    }
}
