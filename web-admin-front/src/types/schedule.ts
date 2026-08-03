// ===================== 排期相关类型 =====================

// ---------- API 层 ----------

/** 排期列表记录 */
export interface ScheduleRecord {
  id: number;
  movieId: number;
  movieName: string;
  cinemaId: number;
  cinemaName: string;
  hallId: number;
  hallName: string;
  showDate: string;
  startTime: string;
  endTime: string;
  price: number;
  languageVersion: string;
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  occupancyRate: number;
  status: 'onsale' | 'cancelled' | 'ended';
  createdAt: string;
}

/** 排期详情 */
export interface ScheduleDetail extends ScheduleRecord {
  moviePosterUrl?: string;
  movieDuration?: number;
  cinemaAddress?: string;
  hallScreenType?: string;
  lockedSeats?: number;
  updatedAt?: string;
}

/** 排期列表查询参数 */
export interface ScheduleListParams {
  cinemaId?: number;
  movieName?: string;
  hallId?: number;
  showDate?: string;
  status?: string;
  page?: number;
  size?: number;
}

/** 新增排期参数 */
export interface ScheduleCreateParams {
  movieId: number;
  cinemaId: number;
  hallId: number;
  showDate: string;
  startTime: string;
  price: number;
  languageVersion: string;
}

/** 修改排期参数 */
export interface ScheduleUpdateParams {
  hallId?: number;
  showDate?: string;
  startTime?: string;
  endTime?: string;
  price?: number;
  languageVersion?: string;
}

// ---------- Store 层 ----------

/** 排期状态 */
export type ScheduleStatus = 'available' | 'full' | 'ended' | 'cancelled';

/** 排期条目（Store / 页面展示用） */
export interface ScheduleItem {
  id: string | number;
  cinemaId: string | number;
  cinemaName: string;
  hallId: string | number;
  hallName: string;
  movieId: string | number;
  movieName: string;
  showDate: string;
  showTime: string;
  endTime: string;
  price: number;
  vipPrice?: number;
  languageVersion: string;
  totalSeats: number;
  soldSeats: number;
  availableSeats: number;
  status: ScheduleStatus;
}
