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

/**
 * 影院内部接口控制器,供 Agent 服务调用,提供影院列表和详情查询。
 * <p>
 * 不对外暴露,路径前缀 {@code /internal},无需用户鉴权,由 Gateway 白名单放行。
 */
@Tag(name = "影院内部接口", description = "Agent调用的影院接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalCinemaController {

    private final CinemaService cinemaService;

    /**
     * 查询影院列表（内部接口）,支持按影片 ID、关键词和设施筛选。
     *
     * @param movieId    影片 ID,用于筛选有该影片排片的影院（可选）
     * @param keyword    搜索关键词,模糊匹配影院名称（可选）
     * @param facilities 设施筛选条件（可选,当前未使用）
     * @param page       页码,默认 1
     * @param size       每页条数,默认 100
     * @return 分页影院列表（用户端视图）
     */
    @Operation(summary = "内部影院列表")
    @GetMapping("/cinemas")
    public Result<PageResult<CinemaUserListVO>> list(
            @Parameter(description = "影片 ID") @RequestParam(required = false) Long movieId,
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "设施筛选") @RequestParam(required = false) String facilities,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "100") Integer size) {
        return Result.success(cinemaService.userList(null, null, movieId, keyword, page, size));
    }

    /**
     * 查询影院详情（内部接口）。
     *
     * @param id 影院 ID
     * @return 影院详细信息
     */
    @Operation(summary = "内部影院详情")
    @GetMapping("/cinemas/{id}")
    public Result<CinemaVO> detail(@Parameter(description = "影院 ID") @PathVariable Long id) {
        return Result.success(cinemaService.userDetail(id));
    }
}
