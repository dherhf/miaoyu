package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.service.DashboardService;
import org.dherhf.vo.CinemaAnalysisVO;
import org.dherhf.vo.DashboardTransactionVO;
import org.dherhf.vo.MovieRankingVO;
import org.dherhf.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "数据看板", description = "交易概览/影片排行/影院分析")
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "交易概览")
    @GetMapping("/transactions")
    public Result<DashboardTransactionVO> transactions(@RequestParam(defaultValue = "7") String period) {
        return dashboardService.transactions(period);
    }

    @Operation(summary = "影片排行")
    @GetMapping("/movies-ranking")
    public Result<List<MovieRankingVO>> moviesRanking(@RequestParam(defaultValue = "boxOffice") String sortBy) {
        return dashboardService.moviesRanking(sortBy);
    }

    @Operation(summary = "影院分析")
    @GetMapping("/cinemas")
    public Result<List<CinemaAnalysisVO>> cinemasAnalysis() {
        return dashboardService.cinemasAnalysis();
    }
}
