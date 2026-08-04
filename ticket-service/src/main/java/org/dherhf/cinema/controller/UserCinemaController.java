package org.dherhf.cinema.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.cinema.service.CinemaService;
import org.dherhf.cinema.vo.CinemaUserListVO;
import org.dherhf.cinema.vo.CinemaVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@Tag(name = "影院查询(用户端)", description = "用户端影院列表/详情")
@RestController
@RequestMapping("/api/v1/cinemas")
@RequiredArgsConstructor
public class UserCinemaController {

    private final CinemaService cinemaService;

    @Operation(summary = "影院列表(用户端)")
    @GetMapping
    public Result<PageResult<CinemaUserListVO>> list(
            @RequestParam(required = false) BigDecimal longitude,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) Long movieId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(cinemaService.userList(longitude, latitude, movieId, null, page, size));
    }

    @Operation(summary = "影院详情(用户端)")
    @GetMapping("/{id}")
    public Result<CinemaVO> detail(@PathVariable Long id) {
        return Result.success(cinemaService.userDetail(id));
    }
}
