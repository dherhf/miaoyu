package org.dherhf.movie.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.movie.service.MovieService;
import org.dherhf.movie.vo.MovieListVO;
import org.dherhf.movie.vo.MovieVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 影片查询控制器（用户端）。
 * <p>
 * 面向 C 端用户的影片浏览接口，仅返回已上架且有在售场次的影片，
 * 路径前缀 {@code /api/v1/movies}。
 */
@Tag(name = "影片查询(用户端)", description = "用户端影片列表/详情")
@RestController
@RequestMapping("/api/v1/movies")
@RequiredArgsConstructor
public class UserMovieController {

    private final MovieService movieService;

    /**
     * 用户端影片列表查询，仅返回已上架且有在售场次的影片。
     *
     * @param keyword 搜索关键词
     * @param type    影片类型
     * @param page    页码
     * @param size    每页条数
     * @param sort    排序字段
     * @return 分页影片列表
     */
    @Operation(summary = "影片列表(用户端)")
    @GetMapping
    public Result<PageResult<MovieListVO>> list(
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "影片类型") @RequestParam(required = false) String type,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size,
            @Parameter(description = "排序字段") @RequestParam(required = false) String sort) {
        return Result.success(movieService.userList(keyword, type, null, null, page, size, sort));
    }

    /**
     * 用户端影片详情查询，仅返回已上架影片。
     *
     * @param id 影片 ID
     * @return 影片详情
     */
    @Operation(summary = "影片详情(用户端)")
    @GetMapping("/{id}")
    public Result<MovieVO> detail(@Parameter(description = "影片 ID") @PathVariable Long id) {
        return Result.success(movieService.userDetail(id));
    }
}
