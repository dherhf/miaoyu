import request from '../utils/request';
import type {
  TransactionsResult,
  MoviesRankingResult,
  CinemasAnalysisResult,
} from '../types/dashboard';

export type {
  TodayStats,
  YesterdayCompare,
  TrendItem,
  TransactionsResult,
  MovieRankingItem,
  MoviesRankingResult,
  CinemaAnalysisItem,
  CinemasAnalysisResult,
} from '../types/dashboard';

// ===================== API =====================

/** 交易概览 */
export function getTransactions(period: '7d' | '30d' = '7d'): Promise<TransactionsResult> {
  return request.get('/dashboard/transactions', { params: { period } });
}

/** 影片热度排行 TOP 10 */
export function getMoviesRanking(
  sortBy: 'ticketCount' | 'boxOffice' | 'occupancyRate' = 'ticketCount',
): Promise<MoviesRankingResult> {
  return request.get('/dashboard/movies-ranking', { params: { sortBy } });
}

/** 影院运营分析 */
export function getCinemasAnalysis(): Promise<CinemasAnalysisResult> {
  return request.get('/dashboard/cinemas');
}
