package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.service.CinemaService;
import org.dherhf.vo.CinemaUserListVO;
import org.dherhf.vo.CinemaVO;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/cinemas")
@RequiredArgsConstructor
public class UserCinemaController {

    private final CinemaService cinemaService;

    @GetMapping
    public Result<PageResult<CinemaUserListVO>> list(
            @RequestParam(required = false) BigDecimal longitude,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) Long movieId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return cinemaService.userList(longitude, latitude, movieId, page, size);
    }

    @GetMapping("/{id}")
    public Result<CinemaVO> detail(@PathVariable Long id) {
        return cinemaService.userDetail(id);
    }
}
