package org.dherhf.movie.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.annotation.AuditLog;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.order.dto.BatchIdsDTO;
import org.dherhf.movie.dto.MovieCreateDTO;
import org.dherhf.movie.dto.MovieUpdateDTO;
import org.dherhf.movie.service.MovieService;
import org.dherhf.order.vo.BatchOperateVO;
import org.dherhf.movie.vo.MovieListVO;
import org.dherhf.movie.vo.MovieVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 影片管理控制器（管理端）。
 * <p>
 * 提供影片的增删改查、上下架、批量上下架等管理功能，
 * 路径前缀 {@code /api/v1/admin/movies}。
 */
@Tag(name = "影片管理(管理端)", description = "影片CRUD/上下架/批量操作")
@RestController
@RequestMapping("/api/v1/admin/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    /**
     * 新增影片。
     *
     * @param dto 影片创建参数（名称、类型、海报、时长等）
     * @return 创建后的影片详情
     */
    @Operation(summary = "新增影片")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "movie")
    public Result<MovieVO> create(@Valid @RequestBody MovieCreateDTO dto) {
        return Result.success(movieService.createMovie(dto));
    }

    /**
     * 编辑影片信息。
     *
     * @param id  影片 ID
     * @param dto  影片更新参数
     * @return 更新后的影片详情
     */
    @Operation(summary = "编辑影片")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "movie")
    public Result<MovieVO> update(
            @Parameter(description = "影片 ID") @PathVariable Long id,
            @Valid @RequestBody MovieUpdateDTO dto) {
        return Result.success(movieService.updateMovie(id, dto));
    }

    /**
     * 上架影片，使其对用户端可见。
     *
     * @param id 影片 ID
     * @return 空响应
     */
    @Operation(summary = "上架影片")
    @PutMapping("/{id}/publish")
    @AuditLog(action = "PUBLISH", targetType = "movie")
    public Result<Void> publish(@Parameter(description = "影片 ID") @PathVariable Long id) {
        movieService.publishMovie(id);
        return Result.success();
    }

    /**
     * 下架影片，使其对用户端不可见。
     *
     * @param id 影片 ID
     * @return 空响应
     */
    @Operation(summary = "下架影片")
    @PutMapping("/{id}/unpublish")
    @AuditLog(action = "UNPUBLISH", targetType = "movie")
    public Result<Void> unpublish(@Parameter(description = "影片 ID") @PathVariable Long id) {
        movieService.unpublishMovie(id);
        return Result.success();
    }

    /**
     * 批量上架影片。
     *
     * @param dto 包含待上架影片 ID 列表的请求体
     * @return 批量操作结果（成功/失败 ID 及失败原因）
     */
    @Operation(summary = "批量上架影片")
    @PutMapping("/batch-publish")
    public Result<BatchOperateVO> batchPublish(@Valid @RequestBody BatchIdsDTO dto) {
        return Result.success(movieService.batchPublish(dto));
    }

    /**
     * 批量下架影片。
     *
     * @param dto 包含待下架影片 ID 列表的请求体
     * @return 批量操作结果（成功/失败 ID 及失败原因）
     */
    @Operation(summary = "批量下架影片")
    @PutMapping("/batch-unpublish")
    public Result<BatchOperateVO> batchUnpublish(@Valid @RequestBody BatchIdsDTO dto) {
        return Result.success(movieService.batchUnpublish(dto));
    }

    /**
     * 管理端影片列表查询，支持按关键词、类型、状态筛选和排序。
     *
     * @param keyword 搜索关键词
     * @param type    影片类型
     * @param status  影片状态（0-下架，1-上架）
     * @param page    页码
     * @param size    每页条数
     * @param sort    排序字段（如 rating_desc）
     * @return 分页影片列表
     */
    @Operation(summary = "影片列表(管理端)")
    @GetMapping
    public Result<PageResult<MovieListVO>> list(
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "影片类型") @RequestParam(required = false) String type,
            @Parameter(description = "影片状态") @RequestParam(required = false) Integer status,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size,
            @Parameter(description = "排序字段") @RequestParam(required = false) String sort) {
        return Result.success(movieService.adminList(keyword, type, status, page, size, sort));
    }

    /**
     * 管理端影片详情查询，不限制影片上下架状态。
     *
     * @param id 影片 ID
     * @return 影片详情
     */
    @Operation(summary = "影片详情(管理端)")
    @GetMapping("/{id}")
    public Result<MovieVO> detail(@Parameter(description = "影片 ID") @PathVariable Long id) {
        return Result.success(movieService.adminDetail(id));
    }
}
