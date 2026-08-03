import request, { type PageResult } from '../utils/request';

// ===================== 类型 =====================
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

export interface ScheduleDetail extends ScheduleRecord {
  moviePosterUrl?: string;
  movieDuration?: number;
  cinemaAddress?: string;
  hallScreenType?: string;
  lockedSeats?: number;
  updatedAt?: string;
}

export interface ScheduleListParams {
  cinemaId?: number;
  movieName?: string;
  hallId?: number;
  showDate?: string;
  status?: string;
  page?: number;
  size?: number;
}

export interface ScheduleCreateParams {
  movieId: number;
  cinemaId: number;
  hallId: number;
  showDate: string;
  startTime: string;
  price: number;
  languageVersion: string;
}

export interface ScheduleUpdateParams {
  hallId?: number;
  showDate?: string;
  startTime?: string;
  endTime?: string;
  price?: number;
  languageVersion?: string;
}

// ===================== API =====================

/** 查询场次列表 */
export function getScheduleList(params: ScheduleListParams): Promise<PageResult<ScheduleRecord>> {
  return request.get('/schedules', { params });
}

/** 查询场次详情 */
export function getScheduleDetail(id: number): Promise<ScheduleDetail> {
  return request.get(`/schedules/${id}`);
}

/** 新增场次 */
export function createSchedule(data: ScheduleCreateParams): Promise<ScheduleDetail> {
  return request.post('/schedules', data);
}

/** 修改场次 */
export function updateSchedule(id: number, data: ScheduleUpdateParams): Promise<ScheduleDetail> {
  return request.put(`/schedules/${id}`, data);
}

/** 取消场次 */
export function cancelSchedule(id: number): Promise<null> {
  return request.put(`/schedules/${id}/cancel`);
}
