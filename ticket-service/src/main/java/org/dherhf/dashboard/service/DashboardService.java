package org.dherhf.dashboard.service;

import org.dherhf.cinema.vo.CinemaAnalysisVO;
import org.dherhf.dashboard.vo.DashboardTransactionVO;
import org.dherhf.movie.vo.MovieRankingVO;
import org.dherhf.common.result.Result;

import java.util.List;

public interface DashboardService {

    Result<DashboardTransactionVO> transactions(String period);

    Result<List<MovieRankingVO>> moviesRanking(String sortBy);

    Result<List<CinemaAnalysisVO>> cinemasAnalysis();
}
