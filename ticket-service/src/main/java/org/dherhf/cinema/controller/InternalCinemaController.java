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

@Tag(name = "影院内部接口", description = "Agent调用的影院接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalCinemaController {

    private final CinemaService cinemaService;

    @Operation(summary = "内部影院列表")
    @GetMapping("/cinemas")
    public Result<PageResult<CinemaUserListVO>> list(
            @RequestParam(required = false) BigDecimal longitude,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) Long movieId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(cinemaService.userList(longitude, latitude, movieId, page, size));
    }

    @Operation(summary = "内部影院详情")
    @GetMapping("/cinemas/{id}")
    public Result<CinemaVO> detail(@PathVariable Long id) {
        return Result.success(cinemaService.userDetail(id));
    }
}
