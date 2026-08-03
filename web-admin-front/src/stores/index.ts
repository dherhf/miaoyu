// 状态管理 barrel export
export { useMovieStore, MOVIE_TYPES } from './movieStore';
export type { MovieStatus, MovieItem, MovieFilters } from '../types/movie';

export type { CinemaStatus, CinemaItem } from '../types/cinema';
export { useCinemaStore } from './cinemaStore';

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
export type { SeatItem, HallItem } from '../types/hall';

export {
  useScheduleStore,
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
} from './scheduleStore';
export type { ScheduleStatus, ScheduleItem } from '../types/schedule';

export { useOrderStore } from './orderStore';
export type { OrderStatus, OrderSeat, OrderItem } from '../types/order';

export { useDashboardStore } from './dashboardStore';
export type {
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
} from '../types/dashboard';
