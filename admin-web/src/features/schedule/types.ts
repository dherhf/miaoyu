// API 层

/** 排期列表记录 */
export interface ScheduleRecord {
  id: string;
  movieId: string;
  movieName: string;
  cinemaId: string;
  cinemaName: string;
  hallId: string;
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
  cinemaId?: string;
  movieId?: string;
  hallId?: string;
  showDate?: string;
  status?: string;
  page?: number;
  size?: number;
}

/** 新增排期参数 */
export interface ScheduleCreateParams {
  movieId: string;
  cinemaId: string;
  hallId: string;
  showDate: string;
  startTime: string;
  price: number;
  languageVersion: string;
}

/** 修改排期参数 */
export interface ScheduleUpdateParams {
  hallId?: string;
  showDate?: string;
  startTime?: string;
  endTime?: string;
  price?: number;
  languageVersion?: string;
}

// Store 层

/** 排期状态 */
export type ScheduleStatus = 'available' | 'full' | 'ended' | 'cancelled';

/** 排期条目（Store / 页面展示用） */
export interface ScheduleItem {
  id: string;
  cinemaId: string;
  cinemaName: string;
  hallId: string;
  hallName: string;
  movieId: string;
  movieName: string;
  showDate: string;
  showTime: string;
  endTime: string;
  price: number;
  languageVersion: string;
  totalSeats: number;
  soldSeats: number;
  availableSeats: number;
  status: ScheduleStatus;
}

// 映射函数

/** API status ('onsale' | 'cancelled' | 'ended') → ScheduleStatus */
export function mapScheduleStatus(status: string, availableSeats: number): ScheduleStatus {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'ended') return 'ended';
  return availableSeats === 0 ? 'full' : 'available';
}

/** ScheduleRecord → ScheduleItem */
export function mapScheduleRecord(record: ScheduleRecord): ScheduleItem {
  return {
    id: record.id,
    cinemaId: record.cinemaId,
    cinemaName: record.cinemaName,
    hallId: record.hallId,
    hallName: record.hallName,
    movieId: record.movieId,
    movieName: record.movieName,
    showDate: record.showDate,
    showTime: record.startTime,
    endTime: record.endTime,
    price: record.price,
    languageVersion: record.languageVersion,
    totalSeats: record.totalSeats,
    soldSeats: record.soldSeats,
    availableSeats: record.availableSeats,
    status: mapScheduleStatus(record.status, record.availableSeats),
  };
}
