import request, { type PageResult } from '../utils/request';

// ===================== 类型 =====================
export interface HallRecord {
  id: number;
  cinemaId: number;
  cinemaName: string;
  name: string;
  screenType: string;
  totalRows: number;
  totalCols: number;
  seatCount: number;
  status: number; // 1=启用 0=停用
  createdAt: string;
}

export interface HallCell {
  rowIndex: number;
  colIndex: number;
  cellType: 'seat' | 'void';
  seatLabel?: string;
  seatCategory?: 'regular' | 'vip' | 'couple' | 'wheelchair';
  status?: string;
}

export interface HallDetail extends HallRecord {
  cells: HallCell[];
}

export interface HallListParams {
  cinemaId?: number;
  name?: string;
  screenType?: string;
  status?: number;
  page?: number;
  size?: number;
}

export interface HallCreateParams {
  cinemaId: number;
  name: string;
  screenType?: string;
}

export interface HallUpdateParams {
  name?: string;
  screenType?: string;
  status?: number;
}

export interface LayoutSaveParams {
  totalRows: number;
  totalCols: number;
  cells: HallCell[];
}

export interface LayoutSaveResult {
  hallId: number;
  totalSeats: number;
  updatedAt: string;
}

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
