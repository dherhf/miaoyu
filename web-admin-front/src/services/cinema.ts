import request, { type PageResult } from '../utils/request';

// ===================== 类型 =====================
export interface CinemaRecord {
  id: number;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities?: string[];
  rating?: number;
  phone?: string;
  status: number; // 1=营业中 0=停业
  hallCount: number;
  createdAt: string;
}

export interface CinemaDetail extends CinemaRecord {
  updatedAt: string;
}

export interface CinemaListParams {
  keyword?: string;
  status?: number;
  page?: number;
  size?: number;
}

export interface CinemaCreateParams {
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities?: string[];
  rating?: number;
  phone?: string;
}

// ===================== API =====================

/** 查询影院列表 */
export function getCinemaList(params: CinemaListParams): Promise<PageResult<CinemaRecord>> {
  return request.get('/cinemas', { params });
}

/** 查询影院详情 */
export function getCinemaDetail(id: number): Promise<CinemaDetail> {
  return request.get(`/cinemas/${id}`);
}

/** 新增影院 */
export function createCinema(data: CinemaCreateParams): Promise<CinemaDetail> {
  return request.post('/cinemas', data);
}

/** 编辑影院 */
export function updateCinema(id: number, data: CinemaCreateParams): Promise<CinemaDetail> {
  return request.put(`/cinemas/${id}`, data);
}

/** 停业 */
export function closeCinema(id: number): Promise<null> {
  return request.put(`/cinemas/${id}/close`);
}

/** 营业 */
export function openCinema(id: number): Promise<null> {
  return request.put(`/cinemas/${id}/open`);
}
