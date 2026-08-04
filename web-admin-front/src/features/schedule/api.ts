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

// API

export const scheduleApi = {
  /** 查询场次列表 */
  getList: (params: ScheduleListParams): Promise<PageResult<ScheduleRecord>> =>
    request.get('/schedules', { params }),

  /** 查询场次详情 */
  getDetail: (id: string): Promise<ScheduleDetail> =>
    request.get(`/schedules/${id}`),

  /** 新增场次 */
  create: (data: ScheduleCreateParams): Promise<ScheduleDetail> =>
    request.post('/schedules', data),

  /** 修改场次 */
  update: (id: number, data: ScheduleUpdateParams): Promise<ScheduleDetail> =>
    request.put(`/schedules/${id}`, data),

  /** 取消场次 */
  cancel: (id: string): Promise<null> =>
    request.put(`/schedules/${id}/cancel`),

  /** 删除场次 */
  delete: (id: string): Promise<null> =>
    request.delete(`/schedules/${id}`),
};
