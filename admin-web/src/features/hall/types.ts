// ===================== 影厅相关类型 =====================

// ---------- API 层（与后端接口直接对应的类型）----------

/** 影厅列表记录（API 返回） */
export interface HallRecord {
  /** 影厅 ID */
  id: string;
  /** 所属影院 ID */
  cinemaId: string;
  /** 所属影院名称 */
  cinemaName: string;
  /** 影厅名称 */
  name: string;
  /** 放映类型（2d/3d/imax） */
  screenType: string;
  /** 总行数 */
  totalRows: number;
  /** 总列数 */
  totalCols: number;
  /** 总座位数 */
  seatCount: number;
  /** 状态：1=启用 0=停用 */
  status: number;
  /** 创建时间 */
  createdAt: string;
}

/** 座位单元格（API 层，与后端 HallCell 对应） */
export interface HallCell {
  /** 行号（1-based） */
  rowIndex: number;
  /** 列号（1-based） */
  colIndex: number;
  /** 单元格类型：seat=座位 / void=过道 */
  cellType: 'seat' | 'void';
  /** 座位标签（如 A1, B2） */
  seatLabel?: string;
  /** 座位类别：regular=普通 / vip=VIP / couple=情侣 / wheelchair=轮椅 */
  seatCategory?: 'regular' | 'vip' | 'couple' | 'wheelchair';
  /** 座位状态 */
  status?: string;
}

/** 影厅详情（含座位布局） */
export interface HallDetail extends HallRecord {
  /** 座位单元格列表 */
  cells: HallCell[];
}

/** 影厅列表查询参数 */
export interface HallListParams {
  /** 影院 ID */
  cinemaId?: string;
  /** 影厅名称（模糊搜索） */
  name?: string;
  /** 放映类型 */
  screenType?: string;
  /** 状态：1=启用 0=停用 */
  status?: number;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  size?: number;
}

/** 新增影厅参数 */
export interface HallCreateParams {
  /** 所属影院 ID */
  cinemaId: string;
  /** 影厅名称 */
  name: string;
  /** 放映类型 */
  screenType?: string;
}

/** 修改影厅基础信息参数 */
export interface HallUpdateParams {
  /** 影厅名称 */
  name?: string;
  /** 放映类型 */
  screenType?: string;
  /** 状态：1=启用 0=停用 */
  status?: number;
}

/** 保存座位布局参数 */
export interface LayoutSaveParams {
  /** 总行数 */
  totalRows: number;
  /** 总列数 */
  totalCols: number;
  /** 座位单元格列表 */
  cells: HallCell[];
}

/** 保存座位布局响应 */
export interface LayoutSaveResult {
  /** 影厅 ID */
  hallId: string;
  /** 总座位数 */
  totalSeats: number;
  /** 更新时间 */
  updatedAt: string;
}

// ---------- Store 层（前端展示用类型）----------

/** 座位条目（Store 层简化版） */
export interface SeatItem {
  /** 行号（1-based） */
  row: number;
  /** 列号（1-based） */
  col: number;
  /** 状态：available=可用 / aisle=过道 */
  status: 'available' | 'aisle';
}

/** 影厅条目（Store / 页面展示用） */
export interface HallItem {
  /** 影厅 ID */
  id: string;
  /** 所属影院 ID */
  cinemaId: string;
  /** 影厅名称 */
  name: string;
  /** 放映类型 */
  type: string;
  /** 总行数 */
  rowCount: number;
  /** 总列数 */
  colCount: number;
  /** 总座位数 */
  totalSeats: number;
  /** 座位列表 */
  seats: SeatItem[];
  /** 状态：active=启用 / inactive=停用 */
  status: string;
}

/** 影厅表单值 */
export interface HallFormValues {
  /** 影厅名称 */
  name: string;
  /** 放映类型 */
  type: string;
  /** 总行数 */
  rowCount: number;
  /** 总列数 */
  colCount: number;
  /** 总座位数 */
  totalSeats: number;
  /** 座位列表 */
  seats: SeatItem[];
}

// ---------- 映射函数（API 类型 ↔ Store 类型转换）----------

/**
 * API status (1=启用 0=停用) → HallItem status string
 */
export function mapHallStatus(status: number): string {
  return status === 1 ? 'active' : 'inactive';
}

/**
 * HallItem status string → API status (1=启用 0=停用)
 */
export function toApiHallStatus(status: string): number {
  return status === 'active' ? 1 : 0;
}

/**
 * HallCell (API) → SeatItem (Store)
 * 将后端座位单元格转换为前端简化版
 */
export function mapHallCell(cell: HallCell): SeatItem {
  return {
    row: cell.rowIndex,
    col: cell.colIndex,
    status: cell.cellType === 'void' ? 'aisle' : 'available',
  };
}

/**
 * SeatItem (Store) → HallCell (API)
 * 将前端座位转换为后端格式，自动生成座位标签
 */
export function toHallCell(seat: SeatItem): HallCell {
  const cellType = seat.status === 'aisle' ? 'void' : 'seat';
  return {
    rowIndex: seat.row,
    colIndex: seat.col,
    cellType,
    seatLabel: cellType === 'seat' ? generateSeatLabel(seat.row, seat.col) : undefined,
  };
}

/**
 * 生成座位标签
 * 行号转字母（1→A, 2→B...）+ 列号
 * 例如：行1列3 → "A3"
 */
function generateSeatLabel(row: number, col: number): string {
  const rowChar = String.fromCharCode('A'.charCodeAt(0) + row - 1);
  return `${rowChar}${col}`;
}

/**
 * HallRecord (API) → HallItem (Store)
 * 转换字段类型，seats 初始为空数组（需要时通过 getHallDetail 获取）
 */
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

/**
 * HallDetail (API) → HallItem (Store)
 * 转换含座位布局的详情数据
 */
export function mapHallDetail(detail: HallDetail): HallItem {
  return {
    ...mapHallRecord(detail),
    seats: (detail.cells ?? []).map(mapHallCell),
  };
}
