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
 * 影片内部接口控制器。
 * <p>
 * 供 agent-service（AI 购票 Agent）调用的影片查询接口，
 * 路径前缀 {@code /internal}，受 {@link org.dherhf.common.interceptor.InternalTokenInterceptor} 保护。
 */
@Tag(name = "影片内部接口", description = "Agent调用的影片接口")
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalMovieController {

    private final MovieService movieService;

    /**
     * 查询影片列表（内部接口，供 Agent 调用）。
     *
     * @param keyword  搜索关键词，按影片名称模糊匹配
     * @param type     影片类型筛选
     * @param cinemaId 影院 ID 筛选，仅返回该影院有在售场次的影片
     * @param date     日期筛选，格式 yyyy-MM-dd
     * @param page     页码，从 1 开始
     * @param size     每页条数
     * @return 分页影片列表
     */
    @Operation(summary = "内部影片列表")
    @GetMapping("/movies")
    public Result<PageResult<MovieListVO>> list(
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "影片类型") @RequestParam(required = false) String type,
            @Parameter(description = "影院 ID") @RequestParam(required = false) Long cinemaId,
            @Parameter(description = "日期") @RequestParam(required = false) String date,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(movieService.userList(keyword, type, cinemaId, date, page, size, null));
    }

    /**
     * 查询影片详情（内部接口，供 Agent 调用）。
     *
     * @param id 影片 ID
     * @return 影片详情
     */
    @Operation(summary = "内部影片详情")
    @GetMapping("/movies/{id}")
    public Result<MovieVO> detail(@Parameter(description = "影片 ID") @PathVariable Long id) {
        return Result.success(movieService.userDetail(id));
    }
}
