// ===================== 影厅相关类型 =====================

// ---------- API 层 ----------

/** 影厅列表记录 */
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

/** 座位单元格 */
export interface HallCell {
  rowIndex: number;
  colIndex: number;
  cellType: 'seat' | 'void';
  seatLabel?: string;
  seatCategory?: 'regular' | 'vip' | 'couple' | 'wheelchair';
  status?: string;
}

/** 影厅详情（含座位布局） */
export interface HallDetail extends HallRecord {
  cells: HallCell[];
}

/** 影厅列表查询参数 */
export interface HallListParams {
  cinemaId?: number;
  name?: string;
  screenType?: string;
  status?: number;
  page?: number;
  size?: number;
}

/** 新增影厅参数 */
export interface HallCreateParams {
  cinemaId: number;
  name: string;
  screenType?: string;
}

/** 修改影厅基础信息参数 */
export interface HallUpdateParams {
  name?: string;
  screenType?: string;
  status?: number;
}

/** 保存座位布局参数 */
export interface LayoutSaveParams {
  totalRows: number;
  totalCols: number;
  cells: HallCell[];
}

/** 保存座位布局响应 */
export interface LayoutSaveResult {
  hallId: number;
  totalSeats: number;
  updatedAt: string;
}

// ---------- Store 层 ----------

/** 座位条目（Store 层简化版） */
export interface SeatItem {
  row: number;
  col: number;
  status: 'available' | 'aisle';
}

/** 影厅条目（Store / 页面展示用） */
export interface HallItem {
  id: string | number;
  cinemaId: string | number;
  name: string;
  type: string;
  rowCount: number;
  colCount: number;
  totalSeats: number;
  seats: SeatItem[];
  status: string;
}
