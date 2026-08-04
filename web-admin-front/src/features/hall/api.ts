import request, { type PageResult } from '../../shared/utils/request';
import type {
  HallRecord,
  HallDetail,
  HallListParams,
  HallCreateParams,
  HallUpdateParams,
  LayoutSaveParams,
  LayoutSaveResult,
} from './types';

export type {
  HallRecord,
  HallCell,
  HallDetail,
  HallListParams,
  HallCreateParams,
  HallUpdateParams,
  LayoutSaveParams,
  LayoutSaveResult,
} from './types';

export const hallApi = {
  /** 查询影厅列表 */
  getHallList: (params: HallListParams): Promise<PageResult<HallRecord>> =>
    request.get('/halls', { params }),

  /** 查询影厅详情（含座位布局） */
  getHallDetail: (id: number): Promise<HallDetail> =>
    request.get(`/halls/${id}`),

  /** 新增影厅 */
  createHall: (data: HallCreateParams): Promise<HallRecord> =>
    request.post('/halls', data),

  /** 修改影厅基础信息 */
  updateHall: (id: number, data: HallUpdateParams): Promise<HallRecord> =>
    request.put(`/halls/${id}`, data),

  /** 保存/更新影厅座位布局 */
  saveHallLayout: (id: number, data: LayoutSaveParams): Promise<LayoutSaveResult> =>
    request.put(`/halls/${id}/layout`, data),
};
