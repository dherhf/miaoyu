import request, { type PageResult } from '../../shared/utils/request';
import type {
  CinemaRecord,
  CinemaDetail,
  CinemaListParams,
  CinemaCreateParams,
} from './types';

export type { CinemaRecord, CinemaDetail, CinemaListParams, CinemaCreateParams } from './types';

/**
 * 影院管理 API
 * 对应后端接口：/api/v1/admin/cinemas/*
 */
export const cinemaApi = {
  /**
   * 查询影院列表（分页）
   * GET /api/v1/admin/cinemas
   * @param params - 查询参数（关键词、状态、分页）
   * @returns 分页结果
   */
  getList: (params: CinemaListParams): Promise<PageResult<CinemaRecord>> =>
    request.get('/cinemas', { params }),

  /**
   * 查询影院详情
   * GET /api/v1/admin/cinemas/{id}
   * @param id - 影院 ID
   * @returns 影院详情（含更新时间等额外字段）
   */
  getDetail: (id: string): Promise<CinemaDetail> =>
    request.get(`/cinemas/${id}`),

  /**
   * 新增影院
   * POST /api/v1/admin/cinemas
   * @param data - 影院创建参数（名称、地址、坐标、设施等）
   * @returns 新创建的影院详情
   */
  create: (data: CinemaCreateParams): Promise<CinemaDetail> =>
    request.post('/cinemas', data),

  /**
   * 编辑影院
   * PUT /api/v1/admin/cinemas/{id}
   * @param id - 影院 ID
   * @param data - 影院更新参数
   * @returns 更新后的影院详情
   */
  update: (id: string, data: CinemaCreateParams): Promise<CinemaDetail> =>
    request.put(`/cinemas/${id}`, data),

  /**
   * 停业影院
   * PUT /api/v1/admin/cinemas/{id}/close
   * @param id - 影院 ID
   */
  close: (id: string): Promise<null> =>
    request.put(`/cinemas/${id}/close`) as any,

  /**
   * 恢复营业
   * PUT /api/v1/admin/cinemas/{id}/open
   * @param id - 影院 ID
   */
  open: (id: string): Promise<null> =>
    request.put(`/cinemas/${id}/open`) as any,
};
