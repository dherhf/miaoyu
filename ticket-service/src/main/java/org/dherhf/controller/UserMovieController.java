package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.service.MovieService;
import org.dherhf.vo.MovieListVO;
import org.dherhf.vo.MovieVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/movies")
@RequiredArgsConstructor
public class UserMovieController {

    private final MovieService movieService;

    @GetMapping
    public Result<PageResult<MovieListVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String sort) {
        return movieService.userList(keyword, type, page, size, sort);
    }

    @GetMapping("/{id}")
    public Result<MovieVO> detail(@PathVariable Long id) {
        return movieService.userDetail(id);
    }
}
