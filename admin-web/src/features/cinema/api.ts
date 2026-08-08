import request, { type PageResult } from '../../shared/utils/request';
import type {
  CinemaRecord,
  CinemaDetail,
  CinemaListParams,
  CinemaCreateParams,
} from './types';

export type { CinemaRecord, CinemaDetail, CinemaListParams, CinemaCreateParams } from './types';

export const cinemaApi = {
  /** 查询影院列表 */
  getList: (params: CinemaListParams): Promise<PageResult<CinemaRecord>> =>
    request.get('/cinemas', { params }),

  /** 查询影院详情 */
  getDetail: (id: string): Promise<CinemaDetail> =>
    request.get(`/cinemas/${id}`),

  /** 新增影院 */
  create: (data: CinemaCreateParams): Promise<CinemaDetail> =>
    request.post('/cinemas', data),

  /** 编辑影院 */
  update: (id: string, data: CinemaCreateParams): Promise<CinemaDetail> =>
    request.put(`/cinemas/${id}`, data),

  /** 停业 */
  close: (id: string): Promise<null> =>
    request.put(`/cinemas/${id}/close`) as any,

  /** 营业 */
  open: (id: string): Promise<null> =>
    request.put(`/cinemas/${id}/open`) as any,
};
