import request from '../../shared/utils/request';
import type {
  TransactionsResult,
  MoviesRankingResult,
  CinemasAnalysisResult,
} from './types';

export type {
  TodayStats,
  YesterdayCompare,
  TrendItem,
  TransactionsResult,
  MovieRankingItem,
  MoviesRankingResult,
  CinemaAnalysisItem,
  CinemasAnalysisResult,
} from './types';

export const dashboardApi = {
  /** 交易概览 */
  getTransactions: (period: '7d' | '30d' = '7d'): Promise<TransactionsResult> =>
    request.get('/dashboard/transactions', { params: { period } }),

  /** 影片热度排行 TOP 10 */
  getMoviesRanking: (
    sortBy: 'ticketCount' | 'boxOffice' | 'occupancyRate' = 'ticketCount',
  ): Promise<MoviesRankingResult> =>
    request.get('/dashboard/movies-ranking', { params: { sortBy } }),

  /** 影院运营分析 */
  getCinemasAnalysis: (): Promise<CinemasAnalysisResult> =>
    request.get('/dashboard/cinemas'),
};
