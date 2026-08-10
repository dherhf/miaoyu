package org.dherhf.cinema.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.cinema.service.CinemaService;
import org.dherhf.cinema.vo.CinemaUserListVO;
import org.dherhf.cinema.vo.CinemaVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * 影院查询控制器（用户端）,提供用户端影院列表与详情查询接口。
 * <p>
 * 列表接口支持按经纬度距离排序及按影片筛选。
 */
@Tag(name = "影院查询(用户端)", description = "用户端影院列表/详情")
@RestController
@RequestMapping("/api/v1/cinemas")
@RequiredArgsConstructor
public class UserCinemaController {

    private final CinemaService cinemaService;

    /**
     * 分页查询影院列表（用户端）,支持按经纬度距离排序、按影片筛选。
     *
     * @param longitude 用户经度,用于计算并排序距离（可选）
     * @param latitude  用户纬度,用于计算并排序距离（可选）
     * @param movieId   影片 ID,筛选有该影片排片的影院（可选）
     * @param page      页码,默认 1
     * @param size      每页条数,默认 20
     * @return 分页影院列表（用户端视图）
     */
    @Operation(summary = "影院列表(用户端)")
    @GetMapping
    public Result<PageResult<CinemaUserListVO>> list(
            @Parameter(description = "经度") @RequestParam(required = false) BigDecimal longitude,
            @Parameter(description = "纬度") @RequestParam(required = false) BigDecimal latitude,
            @Parameter(description = "影片 ID") @RequestParam(required = false) Long movieId,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(cinemaService.userList(longitude, latitude, movieId, null, page, size));
    }

    /**
     * 查询影院详情（用户端）,仅返回营业中的影院。
     *
     * @param id 影院 ID
     * @return 影院详细信息
     */
    @Operation(summary = "影院详情(用户端)")
    @GetMapping("/{id}")
    public Result<CinemaVO> detail(@Parameter(description = "影院 ID") @PathVariable Long id) {
        return Result.success(cinemaService.userDetail(id));
    }
}
