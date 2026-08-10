package org.dherhf.dashboard.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.dashboard.service.DashboardService;
import org.dherhf.cinema.vo.CinemaAnalysisVO;
import org.dherhf.dashboard.vo.DashboardTransactionVO;
import org.dherhf.movie.vo.MovieRankingVO;
import org.dherhf.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 数据看板控制器（管理端）。
 * <p>
 * 提供交易概览、影片排行、影院分析等数据统计接口，
 * 路径前缀 {@code /api/v1/admin/dashboard}。
 */
@Tag(name = "数据看板", description = "交易概览/影片排行/影院分析")
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * 查询交易概览数据，包含今日统计、环比昨日变化和趋势图。
     *
     * @param period 时间范围（7 或 30 天）
     * @return 交易概览数据
     */
    @Operation(summary = "交易概览")
    @GetMapping("/transactions")
    public Result<DashboardTransactionVO> transactions(@Parameter(description = "时间范围") @RequestParam(defaultValue = "7") String period) {
        return Result.success(dashboardService.transactions(period));
    }

    /**
     * 查询影片排行，按票房、票数或订单数排序。
     *
     * @param sortBy 排序字段（boxOffice/ticketCount/orderCount）
     * @return 影片排行列表
     */
    @Operation(summary = "影片排行")
    @GetMapping("/movies-ranking")
    public Result<List<MovieRankingVO>> moviesRanking(@Parameter(description = "排序字段") @RequestParam(defaultValue = "boxOffice") String sortBy) {
        return Result.success(dashboardService.moviesRanking(sortBy));
    }

    /**
     * 查询影院分析数据，包括票房、订单数、票数、票房占比和退票率。
     *
     * @return 影院分析列表
     */
    @Operation(summary = "影院分析")
    @GetMapping("/cinemas")
    public Result<List<CinemaAnalysisVO>> cinemasAnalysis() {
        return Result.success(dashboardService.cinemasAnalysis());
    }
}
