import request, { type PageResult } from '../utils/request';
import type {
  ScheduleRecord,
  ScheduleDetail,
  ScheduleListParams,
  ScheduleCreateParams,
  ScheduleUpdateParams,
} from '../types/schedule';

export type {
  ScheduleRecord,
  ScheduleDetail,
  ScheduleListParams,
  ScheduleCreateParams,
  ScheduleUpdateParams,
} from '../types/schedule';

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
