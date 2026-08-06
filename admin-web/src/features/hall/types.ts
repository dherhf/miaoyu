// ===================== 影厅相关类型 =====================

// ---------- API 层 ----------

/** 影厅列表记录 */
export interface HallRecord {
  id: string;
  cinemaId: string;
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
  cinemaId?: string;
  name?: string;
  screenType?: string;
  status?: number;
  page?: number;
  size?: number;
}

/** 新增影厅参数 */
export interface HallCreateParams {
  cinemaId: string;
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
  hallId: string;
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
  id: string;
  cinemaId: string;
  name: string;
  type: string;
  rowCount: number;
  colCount: number;
  totalSeats: number;
  seats: SeatItem[];
  status: string;
}

/** 影厅表单值 */
export interface HallFormValues {
  name: string;
  type: string;
  rowCount: number;
  colCount: number;
  totalSeats: number;
  seats: SeatItem[];
}

// ---------- 映射函数 ----------

/** API status (1=启用 0=停用) → HallItem status string */
export function mapHallStatus(status: number): string {
  return status === 1 ? 'active' : 'inactive';
}

/** HallItem status string → API status (1=启用 0=停用) */
export function toApiHallStatus(status: string): number {
  return status === 'active' ? 1 : 0;
}

/** HallCell → SeatItem */
export function mapHallCell(cell: HallCell): SeatItem {
  return {
    row: cell.rowIndex,
    col: cell.colIndex,
    status: cell.cellType === 'void' ? 'aisle' : 'available',
  };
}

/** SeatItem → HallCell */
export function toHallCell(seat: SeatItem): HallCell {
  const cellType = seat.status === 'aisle' ? 'void' : 'seat';
  return {
    rowIndex: seat.row,
    colIndex: seat.col,
    cellType,
    seatLabel: cellType === 'seat' ? generateSeatLabel(seat.row, seat.col) : undefined,
  };
}

/** 生成座位标签：行1→A, 行2→B... + 列号 */
function generateSeatLabel(row: number, col: number): string {
  const rowChar = String.fromCharCode('A'.charCodeAt(0) + row - 1);
  return `${rowChar}${col}`;
}

/** HallRecord → HallItem */
export function mapHallRecord(record: HallRecord): HallItem {
  return {
    id: record.id,
    cinemaId: record.cinemaId,
    name: record.name,
    type: record.screenType,
    rowCount: record.totalRows,
    colCount: record.totalCols,
    totalSeats: record.seatCount,
    seats: [],
    status: mapHallStatus(record.status),
  };
}

/** HallDetail → HallItem（含座位布局） */
export function mapHallDetail(detail: HallDetail): HallItem {
  return {
    ...mapHallRecord(detail),
    seats: (detail.cells ?? []).map(mapHallCell),
  };
}
