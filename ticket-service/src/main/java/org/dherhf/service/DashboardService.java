package org.dherhf.service;

import org.dherhf.vo.CinemaAnalysisVO;
import org.dherhf.vo.DashboardTransactionVO;
import org.dherhf.vo.MovieRankingVO;
import org.dherhf.common.Result;

import java.util.List;

public interface DashboardService {

    Result<DashboardTransactionVO> transactions(String period);

    Result<List<MovieRankingVO>> moviesRanking(String sortBy);

    Result<List<CinemaAnalysisVO>> cinemasAnalysis();
}
