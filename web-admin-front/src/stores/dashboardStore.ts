import { useSyncExternalStore } from 'react';
import type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
} from '../types/dashboard';

export type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
} from '../types/dashboard';

interface DashboardState {
  stats: DashboardStats;
  trendData: TrendRecord[];
  movieRanking: MovieRankItem[];
  cinemaStats: CinemaRow[];
  cinemaTypeDistribution: CinemaDistItem[];
}

// ===================== Mock 数据 =====================
function buildMockDashboard(): DashboardState {
  return {
    stats: {
      todayOrders: 1248,
      todayRevenue: 98650,
      todayTickets: 3421,
      todayRefunds: 87,
      conversionRate: 85.3,
      avgOrderValue: 79.0,
      pendingOrders: 156,
      timeoutRate: 3.2,
    },
    trendData: [
      { date: '07-28', orders: 1020, revenue: 81200 },
      { date: '07-29', orders: 1150, revenue: 92000 },
      { date: '07-30', orders: 980, revenue: 76800 },
      { date: '07-31', orders: 1350, revenue: 108000 },
      { date: '08-01', orders: 1100, revenue: 87500 },
      { date: '08-02', orders: 1280, revenue: 102300 },
      { date: '08-03', orders: 1248, revenue: 98650 },
    ],
    movieRanking: [
      { rank: 1, name: '流浪地球3', type: '科幻/动作', boxOffice: 28500, occupancy: 92 },
      { rank: 2, name: '哪吒之魔童闹海', type: '动画/动作', boxOffice: 22100, occupancy: 88 },
      { rank: 3, name: '封神第二部', type: '动作/科幻', boxOffice: 18300, occupancy: 78 },
      { rank: 4, name: '唐人街探案4', type: '喜剧/悬疑', boxOffice: 15200, occupancy: 72 },
      { rank: 5, name: '热辣滚烫2', type: '喜剧/爱情', boxOffice: 12500, occupancy: 68 },
      { rank: 6, name: '志愿军：存亡之战', type: '动作', boxOffice: 10800, occupancy: 65 },
      { rank: 7, name: '深海2', type: '动画/悬疑', boxOffice: 8200, occupancy: 58 },
      { rank: 8, name: '熊出没·重启未来', type: '动画/喜剧', boxOffice: 5600, occupancy: 45 },
      { rank: 9, name: '飞驰人生3', type: '喜剧/动作', boxOffice: 4200, occupancy: 52 },
      { rank: 10, name: '长安三万里2', type: '动画/历史', boxOffice: 3100, occupancy: 38 },
    ],
    cinemaStats: [
      { name: '万达影城', branch: 'IMAX店', dailyRevenue: 38500, occupancy: 85 },
      { name: 'CGV影城', branch: '颐堤港店', dailyRevenue: 25200, occupancy: 78 },
      { name: '大地影院', branch: '望京店', dailyRevenue: 16800, occupancy: 72 },
      { name: '百老汇影城', branch: '三里屯店', dailyRevenue: 12800, occupancy: 68 },
      { name: '橙天嘉禾影城', branch: '通州店', dailyRevenue: 5350, occupancy: 42 },
    ],
    cinemaTypeDistribution: [
      { name: 'IMAX', value: 35, count: 4 },
      { name: '杜比', value: 25, count: 3 },
      { name: '标准', value: 20, count: 5 },
      { name: 'VIP', value: 12, count: 2 },
      { name: '4DX', value: 8, count: 1 },
    ],
  };
}

// ===================== 模块级状态 =====================
let state: DashboardState = buildMockDashboard();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// ===================== Store Hook =====================
export function useDashboardStore() {
  const snapshot = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );

  return {
    stats: snapshot.stats,
    trendData: snapshot.trendData,
    movieRanking: snapshot.movieRanking,
    cinemaStats: snapshot.cinemaStats,
    cinemaTypeDistribution: snapshot.cinemaTypeDistribution,

    refreshDashboard: (): void => {
      state = buildMockDashboard();
      emit();
    },
  };
}
