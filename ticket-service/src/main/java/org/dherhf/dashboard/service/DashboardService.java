package org.dherhf.dashboard.service;

import org.dherhf.cinema.vo.CinemaAnalysisVO;
import org.dherhf.dashboard.vo.DashboardTransactionVO;
import org.dherhf.movie.vo.MovieRankingVO;

import java.util.List;

public interface DashboardService {

    DashboardTransactionVO transactions(String period);

    List<MovieRankingVO> moviesRanking(String sortBy);

    List<CinemaAnalysisVO> cinemasAnalysis();
}
