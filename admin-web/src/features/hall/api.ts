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

/**
 * 影厅管理 API
 * 对应后端接口：/api/v1/admin/halls/*
 */
export const hallApi = {
  /**
   * 查询影厅列表（分页）
   * GET /api/v1/admin/halls
   * @param params - 查询参数（影院ID、名称、类型、状态、分页）
   * @returns 分页结果
   */
  getHallList: (params: HallListParams): Promise<PageResult<HallRecord>> =>
    request.get('/halls', { params }),

  /**
   * 查询影厅详情（含座位布局）
   * GET /api/v1/admin/halls/{id}
   * @param id - 影厅 ID
   * @returns 影厅详情（含座位单元格数据）
   */
  getHallDetail: (id: string): Promise<HallDetail> =>
    request.get(`/halls/${id}`),

  /**
   * 新增影厅
   * POST /api/v1/admin/halls
   * @param data - 影厅创建参数（影院ID、名称、类型）
   * @returns 新创建的影厅记录
   */
  createHall: (data: HallCreateParams): Promise<HallRecord> =>
    request.post('/halls', data),

  /**
   * 修改影厅基础信息
   * PUT /api/v1/admin/halls/{id}
   * @param id - 影厅 ID
   * @param data - 影厅更新参数（名称、类型、状态）
   * @returns 更新后的影厅记录
   */
  updateHall: (id: string, data: HallUpdateParams): Promise<HallRecord> =>
    request.put(`/halls/${id}`, data),

  /**
   * 保存/更新影厅座位布局
   * PUT /api/v1/admin/halls/{id}/layout
   * @param id - 影厅 ID
   * @param data - 布局参数（总行数、总列数、座位单元格列表）
   * @returns 保存结果（影厅ID、总座位数、更新时间）
   */
  saveHallLayout: (id: string, data: LayoutSaveParams): Promise<LayoutSaveResult> =>
    request.put(`/halls/${id}/layout`, data),

  /**
   * 删除影厅
   * DELETE /api/v1/admin/halls/{id}
   * @param id - 影厅 ID
   */
  deleteHall: (id: string): Promise<null> =>
    request.delete(`/halls/${id}`) as any,
};
