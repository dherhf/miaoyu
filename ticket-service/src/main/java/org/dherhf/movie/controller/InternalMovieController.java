package org.dherhf.movie.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.movie.service.MovieService;
import org.dherhf.movie.vo.MovieListVO;
import org.dherhf.movie.vo.MovieVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "影片内部接口", description = "Agent调用的影片接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalMovieController {

    private final MovieService movieService;

    @Operation(summary = "内部影片列表")
    @GetMapping("/movies")
    public Result<PageResult<MovieListVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(movieService.userList(keyword, type, page, size, null));
    }

    @Operation(summary = "内部影片详情")
    @GetMapping("/movies/{id}")
    public Result<MovieVO> detail(@PathVariable Long id) {
        return Result.success(movieService.userDetail(id));
    }
}
