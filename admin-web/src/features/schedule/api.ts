import request, { type PageResult } from '../../shared/utils/request';
import type {
  ScheduleRecord,
  ScheduleDetail,
  ScheduleListParams,
  ScheduleCreateParams,
  ScheduleUpdateParams,
} from './types';

export type {
  ScheduleRecord,
  ScheduleDetail,
  ScheduleListParams,
  ScheduleCreateParams,
  ScheduleUpdateParams,
} from './types';

/**
 * 场次/排期管理 API
 * 对应后端接口：/api/v1/admin/schedules/*
 */
export const scheduleApi = {
  /**
   * 查询场次列表（分页）
   * GET /api/v1/admin/schedules
   * @param params - 查询参数（影院ID、影片ID、影厅ID、日期、状态、分页）
   * @returns 分页结果
   */
  getList: (params: ScheduleListParams): Promise<PageResult<ScheduleRecord>> =>
    request.get('/schedules', { params }),

  /**
   * 查询场次详情
   * GET /api/v1/admin/schedules/{id}
   * @param id - 场次 ID
   * @returns 场次详情（含影片海报、时长等额外信息）
   */
  getDetail: (id: string): Promise<ScheduleDetail> =>
    request.get(`/schedules/${id}`),

  /**
   * 新增场次
   * POST /api/v1/admin/schedules
   * @param data - 场次创建参数（影片ID、影院ID、影厅ID、日期、时间、票价、语言版本）
   * @returns 新创建的场次详情
   */
  create: (data: ScheduleCreateParams): Promise<ScheduleDetail> =>
    request.post('/schedules', data),

  /**
   * 修改场次
   * PUT /api/v1/admin/schedules/{id}
   * @param id - 场次 ID
   * @param data - 场次更新参数
   * @returns 更新后的场次详情
   */
  update: (id: string, data: ScheduleUpdateParams): Promise<ScheduleDetail> =>
    request.put(`/schedules/${id}`, data),

  /**
   * 取消场次
   * PUT /api/v1/admin/schedules/{id}/cancel
   * @param id - 场次 ID
   */
  cancel: (id: string): Promise<null> =>
    request.put(`/schedules/${id}/cancel`) as any,

  /**
   * 恢复场次（取消→可售）
   * PUT /api/v1/admin/schedules/{id}/restore
   * @param id - 场次 ID
   */
  restore: (id: string): Promise<null> =>
    request.put(`/schedules/${id}/restore`) as any,

  /**
   * 删除场次
   * DELETE /api/v1/admin/schedules/{id}
   * @param id - 场次 ID
   */
  delete: (id: string): Promise<null> =>
    request.delete(`/schedules/${id}`) as any,
};
