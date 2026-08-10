package org.dherhf.dashboard.service;

import org.dherhf.cinema.vo.CinemaAnalysisVO;
import org.dherhf.dashboard.vo.DashboardTransactionVO;
import org.dherhf.movie.vo.MovieRankingVO;

import java.util.List;

/**
 * 数据看板服务接口。
 * <p>
 * 定义交易概览、影片排行、影院分析等统计方法。
 */
public interface DashboardService {

    /**
     * 查询交易概览数据。
     *
     * @param period 时间范围（7 或 30 天）
     * @return 交易概览数据
     */
    DashboardTransactionVO transactions(String period);

    /**
     * 查询影片排行。
     *
     * @param sortBy 排序字段（boxOffice/ticketCount/orderCount）
     * @return 影片排行列表
     */
    List<MovieRankingVO> moviesRanking(String sortBy);

    /**
     * 查询影院分析数据。
     *
     * @return 影院分析列表
     */
    List<CinemaAnalysisVO> cinemasAnalysis();
}
