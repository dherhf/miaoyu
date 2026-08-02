package org.dherhf.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.AuditLog;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.BatchIdsDTO;
import org.dherhf.dto.MovieCreateDTO;
import org.dherhf.dto.MovieUpdateDTO;
import org.dherhf.service.MovieService;
import org.dherhf.vo.BatchOperateVO;
import org.dherhf.vo.MovieListVO;
import org.dherhf.vo.MovieVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "影片管理(管理端)", description = "影片CRUD/上下架/批量操作")
@RestController
@RequestMapping("/api/v1/admin/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    @Operation(summary = "新增影片")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "movie")
    public Result<MovieVO> create(@Valid @RequestBody MovieCreateDTO dto) {
        return movieService.createMovie(dto);
    }

    @Operation(summary = "编辑影片")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "movie")
    public Result<MovieVO> update(@PathVariable Long id, @Valid @RequestBody MovieUpdateDTO dto) {
        return movieService.updateMovie(id, dto);
    }

    @Operation(summary = "上架影片")
    @PutMapping("/{id}/publish")
    @AuditLog(action = "PUBLISH", targetType = "movie")
    public Result<Void> publish(@PathVariable Long id) {
        return movieService.publishMovie(id);
    }

    @Operation(summary = "下架影片")
    @PutMapping("/{id}/unpublish")
    @AuditLog(action = "UNPUBLISH", targetType = "movie")
    public Result<Void> unpublish(@PathVariable Long id) {
        return movieService.unpublishMovie(id);
    }

    @Operation(summary = "批量上架影片")
    @PutMapping("/batch-publish")
    public Result<BatchOperateVO> batchPublish(@Valid @RequestBody BatchIdsDTO dto) {
        return movieService.batchPublish(dto);
    }

    @Operation(summary = "批量下架影片")
    @PutMapping("/batch-unpublish")
    public Result<BatchOperateVO> batchUnpublish(@Valid @RequestBody BatchIdsDTO dto) {
        return movieService.batchUnpublish(dto);
    }

    @Operation(summary = "影片列表(管理端)")
    @GetMapping
    public Result<PageResult<MovieListVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String sort) {
        return movieService.adminList(keyword, type, status, page, size, sort);
    }

    @Operation(summary = "影片详情(管理端)")
    @GetMapping("/{id}")
    public Result<MovieVO> detail(@PathVariable Long id) {
        return movieService.adminDetail(id);
    }
}
