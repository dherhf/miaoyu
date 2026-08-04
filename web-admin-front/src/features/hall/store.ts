import { create } from 'zustand';
import type { SeatItem, HallItem, HallListParams, HallUpdateParams } from './types';
import { mapHallRecord, toHallCell, toApiHallStatus } from './types';
import { hallApi } from './api';

// 常量
export const HALL_TYPES = [
  { value: '2d', label: '2D', color: '#1677ff' },
  { value: '3d', label: '3D', color: '#52c41a' },
  { value: 'imax', label: 'IMAX', color: '#fa8c16' },
];

export const HALL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '启用', color: 'green' },
  inactive: { label: '停用', color: 'gray' },
};

export const SEAT_STATUS = {
  AVAILABLE: 'available',
  AISLE: 'aisle',
} as const;

export type { SeatItem, HallItem } from './types';

// 纯工具函数
export function generateSeats(rows: number, cols: number): SeatItem[] {
  const seats: SeatItem[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      seats.push({ row: r, col: c, status: SEAT_STATUS.AVAILABLE as 'available' });
    }
  }
  return seats;
}

export function countAvailableSeats(seats: SeatItem[]): number {
  return seats.filter((s) => s.status === SEAT_STATUS.AVAILABLE).length;
}

function maxRow(seats: SeatItem[]): number {
  return seats.length ? Math.max(...seats.map((s) => s.row)) : 0;
}

function maxCol(seats: SeatItem[]): number {
  return seats.length ? Math.max(...seats.map((s) => s.col)) : 0;
}

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

export function removeRow(seats: SeatItem[]): SeatItem[] | { error: string } {
  const rows = maxRow(seats);
  if (rows <= 1) return { error: '至少保留一行' };
  return seats.filter((s) => s.row !== rows);
}

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

export function removeCol(seats: SeatItem[]): SeatItem[] | { error: string } {
  const cols = maxCol(seats);
  if (cols <= 1) return { error: '至少保留一列' };
  return seats.filter((s) => s.col !== cols);
}

// Store
interface HallState {
  halls: HallItem[];
  loading: boolean;
  fetchHalls: (params?: HallListParams) => Promise<void>;
  getHallsByCinemaId: (cinemaId: string) => HallItem[];
  addHall: (payload: Omit<HallItem, 'id'>) => Promise<void>;
  updateHall: (id: string, payload: Partial<HallItem>) => Promise<void>;
  deleteHall: (id: string) => Promise<void>;
}

export const useHallStore = create<HallState>((set, get) => ({
  halls: [],
  loading: false,

  fetchHalls: async (params?: HallListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await hallApi.getHallList(params ?? { page: 1, size: 100 });
      set({ halls: res.records.map(mapHallRecord) });
    } finally {
      set({ loading: false });
    }
  },

  getHallsByCinemaId: (cinemaId: string): HallItem[] => {
    return get().halls.filter((h) => String(h.cinemaId) === String(cinemaId));
  },

  addHall: async (payload: Omit<HallItem, 'id'>): Promise<void> => {
    const created = await hallApi.createHall({
      cinemaId: payload.cinemaId,
      name: payload.name,
      screenType: payload.type,
    });
    if (payload.seats && payload.seats.length > 0) {
      await hallApi.saveHallLayout(created.id, {
        totalRows: payload.rowCount,
        totalCols: payload.colCount,
        cells: payload.seats.map(toHallCell),
      });
    }
    await get().fetchHalls({ cinemaId: payload.cinemaId });
  },

  updateHall: async (id: string, payload: Partial<HallItem>): Promise<void> => {
    // 基础信息更新
    const apiPayload: HallUpdateParams = {};
    if (payload.name !== undefined) apiPayload.name = payload.name;
    if (payload.type !== undefined) apiPayload.screenType = payload.type;
    if (payload.status !== undefined) apiPayload.status = toApiHallStatus(payload.status);
    if (Object.keys(apiPayload).length > 0) {
      await hallApi.updateHall(id, apiPayload);
    }

    // 座位布局更新
    if (payload.seats) {
      const totalRows = payload.rowCount ?? (payload.seats.length ? Math.max(...payload.seats.map((s) => s.row)) : 0);
      const totalCols = payload.colCount ?? (payload.seats.length ? Math.max(...payload.seats.map((s) => s.col)) : 0);
      await hallApi.saveHallLayout(id, {
        totalRows,
        totalCols,
        cells: payload.seats.map(toHallCell),
      });
    }

    const hall = get().halls.find((h) => String(h.id) === String(id));
    if (hall) {
      await get().fetchHalls({ cinemaId: hall.cinemaId });
    }
  },

  deleteHall: async (id: string): Promise<void> => {
    const hall = get().halls.find((h) => String(h.id) === String(id));
    await hallApi.deleteHall(id);
    if (hall) {
      await get().fetchHalls({ cinemaId: hall.cinemaId });
    }
  },
}));
