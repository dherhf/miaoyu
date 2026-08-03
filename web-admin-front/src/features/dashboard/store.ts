import { useSyncExternalStore } from 'react';
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
