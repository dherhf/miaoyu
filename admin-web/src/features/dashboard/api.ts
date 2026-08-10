import request from '../../shared/utils/request';
import type {
  TransactionsResult,
  MovieRankingItem,
  CinemaAnalysisItem,
} from './types';

export type {
  TodayStats,
  YesterdayCompare,
  TrendItem,
  TransactionsResult,
  MovieRankingItem,
  CinemaAnalysisItem,
} from './types';

/**
 * 数据看板 API
 * 对应后端接口：/api/v1/admin/dashboard/*
 */
export const dashboardApi = {
  /**
   * 查询交易概览数据
   * GET /api/v1/admin/dashboard/transactions
   * 返回今日核心指标、昨日对比和趋势数据
   * @param period - 趋势时间范围："7"（近7天）或 "30"（近30天）
   * @returns 交易概览结果（今日指标 + 昨日对比 + 趋势数据）
   */
  getTransactions: (period: '7' | '30' = '7'): Promise<TransactionsResult> =>
    request.get('/dashboard/transactions', { params: { period } }),

  /**
   * 查询影片票房排行
   * GET /api/v1/admin/dashboard/movies-ranking
   * 后端返回裸数组 List<MovieRankingVO>（非包装对象）
   * @param sortBy - 排序方式：boxOffice（票房）/ ticketCount（票数）/ orderCount（订单数）
   * @returns 影片排行列表
   */
  getMoviesRanking: (
    sortBy: 'boxOffice' | 'ticketCount' | 'orderCount' = 'boxOffice',
  ): Promise<MovieRankingItem[]> =>
    request.get('/dashboard/movies-ranking', { params: { sortBy } }),

  /**
   * 查询影院运营分析数据
   * GET /api/v1/admin/dashboard/cinemas
   * 后端返回裸数组 List<CinemaAnalysisVO>（非包装对象）
   * @returns 影院运营分析列表
   */
  getCinemasAnalysis: (): Promise<CinemaAnalysisItem[]> =>
    request.get('/dashboard/cinemas'),
};
