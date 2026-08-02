package org.dherhf.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.BatchIdsDTO;
import org.dherhf.dto.MovieCreateDTO;
import org.dherhf.dto.MovieUpdateDTO;
import org.dherhf.service.MovieService;
import org.dherhf.vo.BatchOperateVO;
import org.dherhf.vo.MovieListVO;
import org.dherhf.vo.MovieVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    @PostMapping
    public Result<MovieVO> create(@Valid @RequestBody MovieCreateDTO dto) {
        return movieService.createMovie(dto);
    }

    @PutMapping("/{id}")
    public Result<MovieVO> update(@PathVariable Long id, @Valid @RequestBody MovieUpdateDTO dto) {
        return movieService.updateMovie(id, dto);
    }

    @PutMapping("/{id}/publish")
    public Result<Void> publish(@PathVariable Long id) {
        return movieService.publishMovie(id);
    }

    @PutMapping("/{id}/unpublish")
    public Result<Void> unpublish(@PathVariable Long id) {
        return movieService.unpublishMovie(id);
    }

    @PutMapping("/batch-publish")
    public Result<BatchOperateVO> batchPublish(@Valid @RequestBody BatchIdsDTO dto) {
        return movieService.batchPublish(dto);
    }

    @PutMapping("/batch-unpublish")
    public Result<BatchOperateVO> batchUnpublish(@Valid @RequestBody BatchIdsDTO dto) {
        return movieService.batchUnpublish(dto);
    }

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

    @GetMapping("/{id}")
    public Result<MovieVO> detail(@PathVariable Long id) {
        return movieService.adminDetail(id);
    }
}
