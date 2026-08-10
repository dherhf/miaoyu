import request from '@/shared/utils/request';
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

export const dashboardApi = {
  /** 交易概览（period: "7" 或 "30"） */
  getTransactions: (period: '7' | '30' = '7'): Promise<TransactionsResult> =>
    request.get('/dashboard/transactions', { params: { period } }),

  /** 影片排行（后端返回裸数组 List<MovieRankingVO>） */
  getMoviesRanking: (
    sortBy: 'boxOffice' | 'ticketCount' | 'orderCount' = 'boxOffice',
  ): Promise<MovieRankingItem[]> =>
    request.get('/dashboard/movies-ranking', { params: { sortBy } }),

  /** 影院运营分析（后端返回裸数组 List<CinemaAnalysisVO>） */
  getCinemasAnalysis: (): Promise<CinemaAnalysisItem[]> =>
    request.get('/dashboard/cinemas'),
};
