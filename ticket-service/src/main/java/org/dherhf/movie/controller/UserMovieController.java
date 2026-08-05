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

@Tag(name = "影片查询(用户端)", description = "用户端影片列表/详情")
@RestController
@RequestMapping("/api/v1/movies")
@RequiredArgsConstructor
public class UserMovieController {

    private final MovieService movieService;

    @Operation(summary = "影片列表(用户端)")
    @GetMapping
    public Result<PageResult<MovieListVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String sort) {
        return Result.success(movieService.userList(keyword, type, null, null, page, size, sort));
    }

    @Operation(summary = "影片详情(用户端)")
    @GetMapping("/{id}")
    public Result<MovieVO> detail(@PathVariable Long id) {
        return Result.success(movieService.userDetail(id));
    }
}
