import { create } from 'zustand';
import type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
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
  YesterdayCompare,
} from './types';

/**
 * 数据看板状态管理接口
 */
interface DashboardState {
  /** 今日核心指标 */
  stats: DashboardStats;
  /** 昨日同期对比数据 */
  yesterdayCompare: YesterdayCompare | null;
  /** 趋势数据（近7天订单量&交易额） */
  trendData: TrendRecord[];
  /** 影片票房排行 TOP 10 */
  movieRanking: MovieRankItem[];
  /** 影院运营分析数据 */
  cinemaStats: CinemaRow[];
  /** 加载中状态 */
  loading: boolean;
  /** 刷新所有看板数据 */
  refreshDashboard: () => Promise<void>;
}

/** 统计指标初始值（全部为 0） */
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

/**
 * 数据看板状态管理 Store（Zustand）
 *
 * 管理数据看板的全部数据：
 * - 统计卡片指标（今日订单、交易额、出票量等）
 * - 趋势图表数据（近7天订单量&交易额）
 * - 影片票房排行
 * - 影院运营分析
 *
 * refreshDashboard 并发请求三个 API，通过映射函数转换后存入 store
 */
export const useDashboardStore = create<DashboardState>((set) => ({
  stats: initialStats,
  yesterdayCompare: null,
  trendData: [],
  movieRanking: [],
  cinemaStats: [],
  loading: false,

  /**
   * 刷新看板数据
   * 并发请求交易概览、影片排行、影院分析三个接口
   * 通过映射函数将 API 数据转换为前端展示格式
   */
  refreshDashboard: async (): Promise<void> => {
    set({ loading: true });
    try {
      // 并发请求三个接口
      const [transactions, moviesRanking, cinemasAnalysis] = await Promise.all([
        dashboardApi.getTransactions('7'),
        dashboardApi.getMoviesRanking(),
        dashboardApi.getCinemasAnalysis(),
      ]);
      // 通过映射函数转换数据格式
      set({
        stats: mapDashboardStats(transactions),
        yesterdayCompare: transactions.yesterdayCompare,
        trendData: mapTrendData(transactions),
        movieRanking: mapMovieRanking(moviesRanking),
        cinemaStats: mapCinemasAnalysis(cinemasAnalysis),
      });
    } finally {
      set({ loading: false });
    }
  },
}));
