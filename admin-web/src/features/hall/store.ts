import { create } from 'zustand';
import type { SeatItem, HallItem, HallListParams, HallUpdateParams } from './types';
import { mapHallRecord, toHallCell, toApiHallStatus } from './types';
import { hallApi } from './api';

// ===================== 常量 =====================

/**
 * 影厅类型列表
 * value: 后端类型标识
 * label: 前端显示文案
 * color: UI 主题色
 */
export const HALL_TYPES = [
  { value: '2d', label: '2D', color: '#1677ff' },
  { value: '3d', label: '3D', color: '#52c41a' },
  { value: 'imax', label: 'IMAX', color: '#fa8c16' },
];

/**
 * 影厅状态标签配置
 * active: 启用 / inactive: 停用
 */
export const HALL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '启用', color: 'green' },
  inactive: { label: '停用', color: 'gray' },
};

/**
 * 座位状态常量
 * available: 可用 / aisle: 过道
 */
export const SEAT_STATUS = {
  AVAILABLE: 'available',
  AISLE: 'aisle',
} as const;

export type { SeatItem, HallItem } from './types';

// ===================== 纯工具函数 =====================

/**
 * 生成默认座位布局（全部可用）
 * @param rows - 行数
 * @param cols - 列数
 * @returns 座位数组，每个座位初始状态为 available
 */
export function generateSeats(rows: number, cols: number): SeatItem[] {
  const seats: SeatItem[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      seats.push({ row: r, col: c, status: SEAT_STATUS.AVAILABLE as 'available' });
    }
  }
  return seats;
}

/**
 * 统计可用座位数
 * @param seats - 座位列表
 * @returns 状态为 available 的座位数量
 */
export function countAvailableSeats(seats: SeatItem[]): number {
  return seats.filter((s) => s.status === SEAT_STATUS.AVAILABLE).length;
}

/** 获取座位列表中的最大行号 */
function maxRow(seats: SeatItem[]): number {
  return seats.length ? Math.max(...seats.map((s) => s.row)) : 0;
}

/** 获取座位列表中的最大列号 */
function maxCol(seats: SeatItem[]): number {
  return seats.length ? Math.max(...seats.map((s) => s.col)) : 0;
}

/**
 * 添加一行座位（在末尾追加）
 * 最多支持 26 行
 * @returns 新座位数组或错误对象
 */
export function addRow(seats: SeatItem[]): SeatItem[] | { error: string } {
  const rows = maxRow(seats);
  const cols = maxCol(seats);
  if (rows >= 26) return { error: '最多支持26行' };
  const newRow = rows + 1;
  const newSeats: SeatItem[] = [];
  for (let c = 1; c <= cols; c++) {
    newSeats.push({ row: newRow, col: c, status: 'available' });
  }
  return [...seats, ...newSeats];
}

/**
 * 删除最后一行
 * 至少保留一行
 * @returns 新座位数组或错误对象
 */
export function removeRow(seats: SeatItem[]): SeatItem[] | { error: string } {
  const rows = maxRow(seats);
  if (rows <= 1) return { error: '至少保留一行' };
  return seats.filter((s) => s.row !== rows);
}

/**
 * 添加一列座位（在末尾追加）
 * 最多支持 24 列
 * @returns 新座位数组或错误对象
 */
export function addCol(seats: SeatItem[]): SeatItem[] | { error: string } {
  const rows = maxRow(seats);
  const cols = maxCol(seats);
  if (cols >= 24) return { error: '最多支持24列' };
  const newCol = cols + 1;
  const newSeats: SeatItem[] = [];
  for (let r = 1; r <= rows; r++) {
    newSeats.push({ row: r, col: newCol, status: 'available' });
  }
  return [...seats, ...newSeats];
}

/**
 * 删除最后一列
 * 至少保留一列
 * @returns 新座位数组或错误对象
 */
export function removeCol(seats: SeatItem[]): SeatItem[] | { error: string } {
  const cols = maxCol(seats);
  if (cols <= 1) return { error: '至少保留一列' };
  return seats.filter((s) => s.col !== cols);
}

// ===================== 影厅状态管理 Store =====================

/**
 * 影厅状态管理接口
 */
interface HallState {
  /** 影厅列表 */
  halls: HallItem[];
  /** 加载中状态 */
  loading: boolean;
  /** 数据总条数 */
  total: number;
  /** 查询影厅列表 */
  fetchHalls: (params?: HallListParams) => Promise<void>;
  /** 获取指定影院的影厅列表（从缓存中筛选） */
  getHallsByCinemaId: (cinemaId: string) => HallItem[];
  /** 新增影厅（创建 + 保存座位布局） */
  addHall: (payload: Omit<HallItem, 'id'>) => Promise<void>;
  /** 更新影厅（基础信息 + 座位布局） */
  updateHall: (id: string, payload: Partial<HallItem>) => Promise<void>;
  /** 删除影厅 */
  deleteHall: (id: string) => Promise<void>;
}

/**
 * 影厅状态管理 Store（Zustand）
 *
 * 影厅 CRUD 操作：
 * - fetchHalls：查询列表，结果通过 mapHallRecord 转换
 * - addHall：先创建影厅基础信息，再保存座位布局
 * - updateHall：分别更新基础信息和座位布局
 * - deleteHall：删除后重新拉取对应影院的影厅列表
 */
export const useHallStore = create<HallState>((set, get) => ({
  halls: [],
  loading: false,
  total: 0,

  /**
   * 查询影厅列表
   * 无参数时默认查询第一页100条
   */
  fetchHalls: async (params?: HallListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await hallApi.getHallList(params ?? { page: 1, size: 100 });
      set({ halls: res.records.map(mapHallRecord), total: res.total });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * 从缓存中获取指定影院的影厅列表
   */
  getHallsByCinemaId: (cinemaId: string): HallItem[] => {
    return get().halls.filter((h) => String(h.cinemaId) === String(cinemaId));
  },

  /**
   * 新增影厅
   * 1. 调用 createHall 创建影厅基础信息
   * 2. 如果有座位布局，调用 saveHallLayout 保存
   * 3. 重新拉取对应影院的影厅列表
   */
  addHall: async (payload: Omit<HallItem, 'id'>): Promise<void> => {
    // 步骤1：创建影厅基础信息
    const created = await hallApi.createHall({
      cinemaId: payload.cinemaId,
      name: payload.name,
      screenType: payload.type,
    });
    // 步骤2：保存座位布局
    if (payload.seats && payload.seats.length > 0) {
      await hallApi.saveHallLayout(created.id, {
        totalRows: payload.rowCount,
        totalCols: payload.colCount,
        cells: payload.seats.map(toHallCell),
      });
    }
    // 步骤3：刷新列表
    await get().fetchHalls({ cinemaId: payload.cinemaId });
  },

  /**
   * 更新影厅
   * 1. 构建更新参数（仅包含有变更的字段）
   * 2. 调用 updateHall 更新基础信息
   * 3. 如果有座位布局，调用 saveHallLayout 保存
   * 4. 重新拉取对应影院的影厅列表
   */
  updateHall: async (id: string, payload: Partial<HallItem>): Promise<void> => {
    // 步骤1：构建基础信息更新参数
    const apiPayload: HallUpdateParams = {};
    if (payload.name !== undefined) apiPayload.name = payload.name;
    if (payload.type !== undefined) apiPayload.screenType = payload.type;
    if (payload.status !== undefined) apiPayload.status = toApiHallStatus(payload.status);
    // 步骤2：更新基础信息（有变更才调用）
    if (Object.keys(apiPayload).length > 0) {
      await hallApi.updateHall(id, apiPayload);
    }

    // 步骤3：更新座位布局
    if (payload.seats) {
      const totalRows = payload.rowCount ?? (payload.seats.length ? Math.max(...payload.seats.map((s) => s.row)) : 0);
      const totalCols = payload.colCount ?? (payload.seats.length ? Math.max(...payload.seats.map((s) => s.col)) : 0);
      await hallApi.saveHallLayout(id, {
        totalRows,
        totalCols,
        cells: payload.seats.map(toHallCell),
      });
    }

    // 步骤4：刷新列表
    const hall = get().halls.find((h) => String(h.id) === String(id));
    if (hall) {
      await get().fetchHalls({ cinemaId: hall.cinemaId });
    }
  },

  /**
   * 删除影厅
   * 删除后重新拉取对应影院的影厅列表
   */
  deleteHall: async (id: string): Promise<void> => {
    const hall = get().halls.find((h) => String(h.id) === String(id));
    await hallApi.deleteHall(id);
    if (hall) {
      await get().fetchHalls({ cinemaId: hall.cinemaId });
    }
  },
}));
