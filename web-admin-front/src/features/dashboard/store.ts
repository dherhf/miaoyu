import { create } from 'zustand';
import type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
} from './types';
import { buildMockDashboard } from './mock';

export type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
} from './types';

interface DashboardState {
  stats: DashboardStats;
  trendData: TrendRecord[];
  movieRanking: MovieRankItem[];
  cinemaStats: CinemaRow[];
  cinemaTypeDistribution: CinemaDistItem[];
  refreshDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>(() => ({
  ...buildMockDashboard(),

  refreshDashboard: (): void => {
    useDashboardStore.setState(buildMockDashboard());
  },
}));
