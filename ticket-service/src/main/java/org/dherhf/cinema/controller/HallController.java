package org.dherhf.cinema.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.common.annotation.AuditLog;
import org.dherhf.cinema.dto.HallCreateDTO;
import org.dherhf.cinema.dto.HallLayoutDTO;
import org.dherhf.cinema.dto.HallUpdateDTO;
import org.dherhf.cinema.service.HallService;
import org.dherhf.cinema.vo.HallDetailVO;
import org.dherhf.cinema.vo.HallListVO;
import org.dherhf.cinema.vo.HallVO;
import org.dherhf.cinema.vo.LayoutResultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 影厅管理控制器,提供影厅的新增、编辑、删除、列表查询、详情查询及座位布局保存接口。
 * <p>
 * 所有接口需管理员鉴权,写操作（新增/编辑/保存布局/删除）均记录审计日志。
 */
@Tag(name = "影厅管理", description = "影厅CRUD/座位布局管理")
@RestController
@RequestMapping("/api/v1/admin/halls")
@RequiredArgsConstructor
public class HallController {

    private final HallService hallService;

    /**
     * 新增影厅。
     *
     * @param dto 影厅创建请求,包含所属影院 ID、名称、银幕类型等信息
     * @return 新创建的影厅信息
     */
    @Operation(summary = "新增影厅")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "hall")
    public Result<HallVO> create(@Valid @RequestBody HallCreateDTO dto) {
        return Result.success(hallService.createHall(dto));
    }

    /**
     * 分页查询影厅列表,支持按影院、名称、银幕类型、状态筛选。
     *
     * @param cinemaId   影院 ID（可选）
     * @param name       影厅名称,模糊匹配（可选）
     * @param screenType 银幕类型,如 IMAX、杜比等（可选）
     * @param status     影厅状态,1-启用,0-未启用（可选）
     * @param page       页码,默认 1
     * @param size       每页条数,默认 20
     * @return 分页影厅列表
     */
    @Operation(summary = "影厅列表")
    @GetMapping
    public Result<PageResult<HallListVO>> list(
            @Parameter(description = "影院 ID") @RequestParam(required = false) Long cinemaId,
            @Parameter(description = "影厅名称") @RequestParam(required = false) String name,
            @Parameter(description = "银幕类型") @RequestParam(required = false) String screenType,
            @Parameter(description = "影厅状态") @RequestParam(required = false) Integer status,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(hallService.list(cinemaId, name, screenType, status, page, size));
    }

    /**
     * 查询影厅详情,包含座位布局信息。
     *
     * @param id 影厅 ID
     * @return 影厅详细信息,包含座位格子列表
     */
    @Operation(summary = "影厅详情")
    @GetMapping("/{id}")
    public Result<HallDetailVO> detail(@Parameter(description = "影厅 ID") @PathVariable Long id) {
        return Result.success(hallService.detail(id));
    }

    /**
     * 编辑影厅基本信息（名称、银幕类型、状态）。
     *
     * @param id  影厅 ID
     * @param dto 影厅更新请求
     * @return 更新后的影厅信息
     */
    @Operation(summary = "编辑影厅")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "hall")
    public Result<HallVO> update(
            @Parameter(description = "影厅 ID") @PathVariable Long id,
            @Valid @RequestBody HallUpdateDTO dto) {
        return Result.success(hallService.updateHall(id, dto));
    }

    /**
     * 保存影厅座位布局,包括行列数及每个座位格子的类型、标签和分类。
     *
     * @param id  影厅 ID
     * @param dto 座位布局请求,包含总行数、总列数和座位格子列表
     * @return 布局保存结果,包含总座位数和更新时间
     */
    @Operation(summary = "保存座位布局")
    @PutMapping("/{id}/layout")
    @AuditLog(action = "UPDATE", targetType = "hall")
    public Result<LayoutResultVO> saveLayout(
            @Parameter(description = "影厅 ID") @PathVariable Long id,
            @Valid @RequestBody HallLayoutDTO dto) {
        return Result.success(hallService.saveLayout(id, dto));
    }

    /**
     * 删除影厅,同时删除关联的座位格子数据。
     *
     * @param id 影厅 ID
     * @return 操作成功的统一响应
     */
    @Operation(summary = "删除影厅")
    @DeleteMapping("/{id}")
    @AuditLog(action = "DELETE", targetType = "hall")
    public Result<Void> delete(@Parameter(description = "影厅 ID") @PathVariable Long id) {
        hallService.deleteHall(id);
        return Result.success();
    }
}
