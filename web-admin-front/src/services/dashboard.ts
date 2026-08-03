import request from '../utils/request';

// ===================== 类型 =====================
export interface TodayStats {
  orderCount: number;
  transactionAmount: number;
  ticketCount: number;
  refundCount: number;
  conversionRate: number;
  avgTicketPrice: number;
  pendingCount: number;
  timeoutCancelRate: number;
}

export interface YesterdayCompare {
  orderCountChange: number;
  transactionAmountChange: number;
  ticketCountChange: number;
}

export interface TrendItem {
  date: string;
  orderCount: number;
  transactionAmount: number;
}

export interface TransactionsResult {
  today: TodayStats;
  yesterdayCompare: YesterdayCompare;
  trend: TrendItem[];
}

export interface MovieRankingItem {
  movieName: string;
  ticketCount: number;
  boxOffice: number;
  orderCount: number;
  occupancyRate: number;
}

export interface MoviesRankingResult {
  ranking: MovieRankingItem[];
}

export interface CinemaAnalysisItem {
  cinemaName: string;
  orderCount: number;
  ticketCount: number;
  boxOffice: number;
  occupancyRate: number;
  refundRate: number;
  boxOfficeShare: number;
}

export interface CinemasAnalysisResult {
  cinemas: CinemaAnalysisItem[];
}

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
