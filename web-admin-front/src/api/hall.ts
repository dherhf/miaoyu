import request, { type PageResult } from '../utils/request';
import type {
  HallRecord,
  HallDetail,
  HallListParams,
  HallCreateParams,
  HallUpdateParams,
  LayoutSaveParams,
  LayoutSaveResult,
} from '../types/hall';

export type {
  HallRecord,
  HallCell,
  HallDetail,
  HallListParams,
  HallCreateParams,
  HallUpdateParams,
  LayoutSaveParams,
  LayoutSaveResult,
} from '../types/hall';

// ===================== API =====================

/** 查询影厅列表 */
export function getHallList(params: HallListParams): Promise<PageResult<HallRecord>> {
  return request.get('/halls', { params });
}

/** 查询影厅详情（含座位布局） */
export function getHallDetail(id: number): Promise<HallDetail> {
  return request.get(`/halls/${id}`);
}

/** 新增影厅 */
export function createHall(data: HallCreateParams): Promise<HallRecord> {
  return request.post('/halls', data);
}

/** 修改影厅基础信息 */
export function updateHall(id: number, data: HallUpdateParams): Promise<HallRecord> {
  return request.put(`/halls/${id}`, data);
}

/** 保存/更新影厅座位布局 */
export function saveHallLayout(id: number, data: LayoutSaveParams): Promise<LayoutSaveResult> {
  return request.put(`/halls/${id}/layout`, data);
}
