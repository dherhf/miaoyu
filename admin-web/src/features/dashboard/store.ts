import { create } from 'zustand';
import type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
  YesterdayCompare,
} from './types';
import {
  mapDashboardStats,
  mapTrendData,
  mapMovieRanking,
  mapCinemasAnalysis,
} from './types';
import { dashboardApi } from './api';

export type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
  YesterdayCompare,
} from './types';

interface DashboardState {
  stats: DashboardStats;
  yesterdayCompare: YesterdayCompare | null;
  trendData: TrendRecord[];
  movieRanking: MovieRankItem[];
  cinemaStats: CinemaRow[];
  cinemaTypeDistribution: CinemaDistItem[];
  loading: boolean;
  refreshDashboard: () => Promise<void>;
}

const initialStats: DashboardStats = {
  todayOrders: 0,
  todayRevenue: 0,
  todayTickets: 0,
  todayRefunds: 0,
  conversionRate: 0,
  avgOrderValue: 0,
  pendingOrders: 0,
  timeoutRate: 0,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: initialStats,
  yesterdayCompare: null,
  trendData: [],
  movieRanking: [],
  cinemaStats: [],
  cinemaTypeDistribution: [],
  loading: false,

  refreshDashboard: async (): Promise<void> => {
    set({ loading: true });
    try {
      const [transactions, moviesRanking, cinemasAnalysis] = await Promise.all([
        dashboardApi.getTransactions('7d'),
        dashboardApi.getMoviesRanking(),
        dashboardApi.getCinemasAnalysis(),
      ]);
      set({
        stats: mapDashboardStats(transactions),
        yesterdayCompare: transactions.yesterdayCompare,
        trendData: mapTrendData(transactions),
        movieRanking: mapMovieRanking(moviesRanking),
        cinemaStats: mapCinemasAnalysis(cinemasAnalysis),
        cinemaTypeDistribution: [],
      });
    } finally {
      set({ loading: false });
    }
  },
}));
