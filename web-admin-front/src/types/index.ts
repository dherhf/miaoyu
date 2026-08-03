// ===================== 类型定义 barrel export =====================

// 通用 API
export type { ApiResponse, PageResult } from './api';

// 认证
export type { LoginParams, AdminInfo, LoginResult, UserRole, AuthUser } from './auth';

// 影片
export type {
  MovieRecord,
  MovieDetail,
  MovieListParams,
  MovieCreateParams,
  BatchResult,
  MovieStatus,
  MovieItem,
  MovieFilters,
} from './movie';

// 影院
export type {
  CinemaRecord,
  CinemaDetail,
  CinemaListParams,
  CinemaCreateParams,
  CinemaStatus,
  CinemaItem,
} from './cinema';

// 影厅
export type {
  HallRecord,
  HallCell,
  HallDetail,
  HallListParams,
  HallCreateParams,
  HallUpdateParams,
  LayoutSaveParams,
  LayoutSaveResult,
  SeatItem,
  HallItem,
} from './hall';

// 排期
export type {
  ScheduleRecord,
  ScheduleDetail,
  ScheduleListParams,
  ScheduleCreateParams,
  ScheduleUpdateParams,
  ScheduleStatus,
  ScheduleItem,
} from './schedule';

// 订单
export type {
  OrderRecord,
  OrderDetail,
  OrderSeatRecord,
  OrderListParams,
  OrderStatus,
  OrderSeat,
  OrderItem,
} from './order';

// 仪表盘
export type {
  TodayStats,
  YesterdayCompare,
  TrendItem,
  TransactionsResult,
  MovieRankingItem,
  MoviesRankingResult,
  CinemaAnalysisItem,
  CinemasAnalysisResult,
  DashboardStats,
  TrendRecord,
  MovieRankItem,
  CinemaRow,
  CinemaDistItem,
} from './dashboard';

// 高德地图
export type {
  AmapResponse,
  GeocodeResult,
  ReGeocodeResult,
  PoiItem,
  PoiAroundItem,
  RouteResult,
  DistrictResult,
  WeatherResult,
  InputTipItem,
} from './amap';
