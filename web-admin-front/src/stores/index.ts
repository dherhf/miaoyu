// 状态管理 barrel export
export { useMovieStore, MOVIE_TYPES } from './movieStore';
export type { MovieItem, MovieStatus } from './movieStore';

export { useCinemaStore } from './cinemaStore';
export type { CinemaItem, CinemaStatus } from './cinemaStore';

export {
  useHallStore,
  HALL_TYPES,
  HALL_STATUS_LABELS,
  SEAT_STATUS,
  generateSeats,
  countAvailableSeats,
  addRow,
  removeRow,
  addCol,
  removeCol,
} from './hallStore';
export type { HallItem, SeatItem } from './hallStore';

export {
  useScheduleStore,
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
} from './scheduleStore';
export type { ScheduleItem, ScheduleStatus } from './scheduleStore';

export { useOrderStore } from './orderStore';
export type { OrderItem, OrderStatus } from './orderStore';

export { useDashboardStore } from './dashboardStore';
export type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
} from './dashboardStore';
