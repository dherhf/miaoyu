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
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 场次管理控制器（管理端）。
 * <p>
 * 提供管理端的场次排片、编辑、取消、恢复、结束、删除，
 * 以及管理端场次列表和详情查询接口。所有写操作均记录审计日志。
 */
@Tag(name = "场次管理(管理端)", description = "场次排片/取消/结束")
@RestController
@RequestMapping("/api/v1/admin/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    /**
     * 新增场次（排片）。
     * <p>
     * 校验影片、影院、影厅有效性及排片冲突后，创建场次并初始化座位和 Redis Bitmap。
     *
     * @param dto 场次创建参数
     * @return 新建场次信息
     */
    @Operation(summary = "新增场次")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "schedule")
    public Result<ScheduleVO> create(@Valid @RequestBody ScheduleCreateDTO dto) {
        return Result.success(scheduleService.createSchedule(dto));
    }

    /**
     * 编辑场次信息。
     * <p>
     * 仅可售场次可修改；若已有售票则不可修改影厅、日期、时间等核心字段。
     *
     * @param id  场次ID
     * @param dto 场次更新参数
     * @return 更新后的场次信息
     */
    @Operation(summary = "编辑场次")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "schedule")
    public Result<ScheduleVO> update(
            @Parameter(description = "场次 ID") @PathVariable Long id,
            @Valid @RequestBody ScheduleUpdateDTO dto) {
        return Result.success(scheduleService.updateSchedule(id, dto));
    }

    /**
     * 取消场次。
     * <p>
     * 仅可取消在售场次，已有售票的场次不可取消。取消后释放锁定座位，
     * 关联未支付订单自动取消并通知用户。
     *
     * @param id 场次ID
     * @return 空结果
     */
    @Operation(summary = "取消场次")
    @PutMapping("/{id}/cancel")
    @AuditLog(action = "DELETE", targetType = "schedule")
    public Result<Void> cancel(@Parameter(description = "场次 ID") @PathVariable Long id) {
        scheduleService.cancelSchedule(id);
        return Result.success();
    }

    /**
     * 恢复已取消的场次。
     * <p>
     * 仅已取消场次可恢复，且放映日期不可过期，恢复前会检查排片冲突。
     *
     * @param id 场次ID
     * @return 空结果
     */
    @Operation(summary = "恢复场次")
    @PutMapping("/{id}/restore")
    @AuditLog(action = "UPDATE", targetType = "schedule")
    public Result<Void> restore(@Parameter(description = "场次 ID") @PathVariable Long id) {
        scheduleService.restoreSchedule(id);
        return Result.success();
    }

    /**
     * 结束场次。
     * <p>
     * 将在售场次置为已结束状态，释放锁定座位，
     * 已出票订单置为已过期（不可再检票），并清理 Redis Bitmap 缓存。
     *
     * @param id 场次ID
     * @return 空结果
     */
    @Operation(summary = "结束场次")
    @PutMapping("/{id}/end")
    @AuditLog(action = "UPDATE", targetType = "schedule")
    public Result<Void> end(@Parameter(description = "场次 ID") @PathVariable Long id) {
        scheduleService.endSchedule(id);
        return Result.success();
    }

    /**
     * 删除场次。
     * <p>
     * 在售场次不可删除（需先取消），存在已售座的场次无法删除。
     * 删除后同步清理座位数据和 Redis Bitmap 缓存。
     *
     * @param id 场次ID
     * @return 空结果
     */
    @Operation(summary = "删除场次")
    @DeleteMapping("/{id}")
    @AuditLog(action = "DELETE", targetType = "schedule")
    public Result<Void> delete(@Parameter(description = "场次 ID") @PathVariable Long id) {
        scheduleService.deleteSchedule(id);
        return Result.success();
    }

    /**
     * 查询管理端场次列表（分页）。
     * <p>
     * 支持按影片、影院、影厅、放映日期、场次状态进行过滤，按创建时间倒序排列。
     *
     * @param movieId  影片ID，可选过滤条件
     * @param cinemaId 影院ID，可选过滤条件
     * @param hallId   影厅ID，可选过滤条件
     * @param showDate 放映日期字符串，可选过滤条件
     * @param status   场次状态，可选过滤条件
     * @param page     页码，从1开始
     * @param size     每页条数
     * @return 分页场次列表结果
     */
    @Operation(summary = "场次列表(管理端)")
    @GetMapping
    public Result<PageResult<ScheduleListVO>> list(
            @Parameter(description = "影片 ID") @RequestParam(required = false) Long movieId,
            @Parameter(description = "影院 ID") @RequestParam(required = false) Long cinemaId,
            @Parameter(description = "影厅 ID") @RequestParam(required = false) Long hallId,
            @Parameter(description = "放映日期") @RequestParam(required = false) String showDate,
            @Parameter(description = "场次状态") @RequestParam(required = false) String status,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(scheduleService.adminList(movieId, cinemaId, hallId, showDate, status, page, size));
    }

    /**
     * 查询管理端场次详情。
     *
     * @param id 场次ID
     * @return 场次详情结果
     */
    @Operation(summary = "场次详情(管理端)")
    @GetMapping("/{id}")
    public Result<ScheduleDetailVO> detail(@Parameter(description = "场次 ID") @PathVariable Long id) {
        return Result.success(scheduleService.adminDetail(id));
    }
}
