package org.dherhf.schedule.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.common.annotation.AuditLog;
import org.dherhf.schedule.dto.ScheduleCreateDTO;
import org.dherhf.schedule.dto.ScheduleUpdateDTO;
import org.dherhf.schedule.service.ScheduleService;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.ScheduleVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "场次管理(管理端)", description = "场次排片/取消/结束")
@RestController
@RequestMapping("/api/v1/admin/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @Operation(summary = "新增场次")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "schedule")
    public Result<ScheduleVO> create(@Valid @RequestBody ScheduleCreateDTO dto) {
        return Result.success(scheduleService.createSchedule(dto));
    }

    @Operation(summary = "编辑场次")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "schedule")
    public Result<ScheduleVO> update(@PathVariable Long id, @Valid @RequestBody ScheduleUpdateDTO dto) {
        return Result.success(scheduleService.updateSchedule(id, dto));
    }

    @Operation(summary = "取消场次")
    @PutMapping("/{id}/cancel")
    @AuditLog(action = "DELETE", targetType = "schedule")
    public Result<Void> cancel(@PathVariable Long id) {
        scheduleService.cancelSchedule(id);
        return Result.success();
    }

    @Operation(summary = "恢复场次")
    @PutMapping("/{id}/restore")
    @AuditLog(action = "UPDATE", targetType = "schedule")
    public Result<Void> restore(@PathVariable Long id) {
        scheduleService.restoreSchedule(id);
        return Result.success();
    }

    @Operation(summary = "结束场次")
    @PutMapping("/{id}/end")
    @AuditLog(action = "UPDATE", targetType = "schedule")
    public Result<Void> end(@PathVariable Long id) {
        scheduleService.endSchedule(id);
        return Result.success();
    }

    @Operation(summary = "删除场次")
    @DeleteMapping("/{id}")
    @AuditLog(action = "DELETE", targetType = "schedule")
    public Result<Void> delete(@PathVariable Long id) {
        scheduleService.deleteSchedule(id);
        return Result.success();
    }

    @Operation(summary = "场次列表(管理端)")
    @GetMapping
    public Result<PageResult<ScheduleListVO>> list(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) Long hallId,
            @RequestParam(required = false) String showDate,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(scheduleService.adminList(movieId, cinemaId, hallId, showDate, status, page, size));
    }

    @Operation(summary = "场次详情(管理端)")
    @GetMapping("/{id}")
    public Result<ScheduleDetailVO> detail(@PathVariable Long id) {
        return Result.success(scheduleService.adminDetail(id));
    }
}
