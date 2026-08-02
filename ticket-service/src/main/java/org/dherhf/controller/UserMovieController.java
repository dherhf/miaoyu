package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.service.MovieService;
import org.dherhf.vo.MovieListVO;
import org.dherhf.vo.MovieVO;
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
        return movieService.userList(keyword, type, page, size, sort);
    }

    @Operation(summary = "影片详情(用户端)")
    @GetMapping("/{id}")
    public Result<MovieVO> detail(@PathVariable Long id) {
        return movieService.userDetail(id);
    }
}
