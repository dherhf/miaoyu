import request, { type PageResult } from '../../shared/utils/request';
import type {
  CinemaRecord,
  CinemaDetail,
  CinemaListParams,
  CinemaCreateParams,
} from './types';

export type { CinemaRecord, CinemaDetail, CinemaListParams, CinemaCreateParams } from './types';

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
