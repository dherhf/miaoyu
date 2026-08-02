package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.service.DashboardService;
import org.dherhf.vo.CinemaAnalysisVO;
import org.dherhf.vo.DashboardTransactionVO;
import org.dherhf.vo.MovieRankingVO;
import org.dherhf.common.Result;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/transactions")
    public Result<DashboardTransactionVO> transactions(@RequestParam(defaultValue = "7") String period) {
        return dashboardService.transactions(period);
    }

    @GetMapping("/movies-ranking")
    public Result<List<MovieRankingVO>> moviesRanking(@RequestParam(defaultValue = "boxOffice") String sortBy) {
        return dashboardService.moviesRanking(sortBy);
    }

    @GetMapping("/cinemas")
    public Result<List<CinemaAnalysisVO>> cinemasAnalysis() {
        return dashboardService.cinemasAnalysis();
    }
}
