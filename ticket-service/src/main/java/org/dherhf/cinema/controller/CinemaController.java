package org.dherhf.cinema.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.common.annotation.AuditLog;
import org.dherhf.cinema.dto.CinemaCreateDTO;
import org.dherhf.cinema.dto.CinemaUpdateDTO;
import org.dherhf.cinema.service.CinemaService;
import org.dherhf.cinema.vo.CinemaListVO;
import org.dherhf.cinema.vo.CinemaVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 影院管理控制器（管理端）,提供影院的新增、编辑、停业、营业、列表查询及详情查询接口。
 * <p>
 * 所有接口需管理员鉴权,写操作（新增/编辑/停业/营业）均记录审计日志。
 */
@Tag(name = "影院管理(管理端)", description = "影院CRUD/停业营业")
@RestController
@RequestMapping("/api/v1/admin/cinemas")
@RequiredArgsConstructor
public class CinemaController {

    private final CinemaService cinemaService;

    /**
     * 新增影院。
     *
     * @param dto 影院创建请求,包含名称、地址、经纬度、设施、评分、电话等信息
     * @return 新创建的影院信息
     */
    @Operation(summary = "新增影院")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "cinema")
    public Result<CinemaVO> create(@Valid @RequestBody CinemaCreateDTO dto) {
        return Result.success(cinemaService.createCinema(dto));
    }

    /**
     * 编辑影院信息。
     *
     * @param id  影厅 ID
     * @param dto 影院更新请求,包含需要修改的字段
     * @return 更新后的影院信息
     */
    @Operation(summary = "编辑影院")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "cinema")
    public Result<CinemaVO> update(
            @Parameter(description = "影院 ID") @PathVariable Long id,
            @Valid @RequestBody CinemaUpdateDTO dto) {
        return Result.success(cinemaService.updateCinema(id, dto));
    }

    /**
     * 影厅停业,将影院状态置为停业。
     *
     * @param id 影院 ID
     * @return 操作成功的统一响应
     */
    @Operation(summary = "影院停业")
    @PutMapping("/{id}/close")
    @AuditLog(action = "UPDATE", targetType = "cinema")
    public Result<Void> close(@Parameter(description = "影院 ID") @PathVariable Long id) {
        cinemaService.closeCinema(id);
        return Result.success();
    }

    /**
     * 影院营业,将影院状态置为营业。
     *
     * @param id 影院 ID
     * @return 操作成功的统一响应
     */
    @Operation(summary = "影院营业")
    @PutMapping("/{id}/open")
    @AuditLog(action = "UPDATE", targetType = "cinema")
    public Result<Void> open(@Parameter(description = "影院 ID") @PathVariable Long id) {
        cinemaService.openCinema(id);
        return Result.success();
    }

    /**
     * 分页查询影院列表（管理端）,支持按关键词和状态筛选。
     *
     * @param keyword 搜索关键词,模糊匹配影院名称（可选）
     * @param status  影院状态筛选,1-营业,0-停业（可选）
     * @param page    页码,默认 1
     * @param size    每页条数,默认 20
     * @return 分页影院列表
     */
    @Operation(summary = "影院列表(管理端)")
    @GetMapping
    public Result<PageResult<CinemaListVO>> list(
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "影院状态") @RequestParam(required = false) Integer status,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(cinemaService.adminList(keyword, status, page, size));
    }

    /**
     * 查询影院详情（管理端）。
     *
     * @param id 影院 ID
     * @return 影院详细信息
     */
    @Operation(summary = "影院详情(管理端)")
    @GetMapping("/{id}")
    public Result<CinemaVO> detail(@Parameter(description = "影院 ID") @PathVariable Long id) {
        return Result.success(cinemaService.adminDetail(id));
    }
}
