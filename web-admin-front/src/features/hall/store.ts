import { create } from 'zustand';
import type { SeatItem, HallItem } from './types';
import { mockHalls } from './mock';

// ===================== 常量 =====================
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

// ===================== 纯工具函数 =====================
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

// ===================== Store =====================
interface HallState {
  halls: HallItem[];
  getHallsByCinemaId: (cinemaId: string | number) => HallItem[];
  addHall: (payload: Omit<HallItem, 'id'>) => Promise<void>;
  updateHall: (id: string | number, payload: Partial<HallItem>) => Promise<void>;
  deleteHall: (id: string | number) => void;
}

export const useHallStore = create<HallState>((set, get) => ({
  halls: mockHalls,

  getHallsByCinemaId: (cinemaId: string | number): HallItem[] => {
    return get().halls.filter((h) => String(h.cinemaId) === String(cinemaId));
  },

  addHall: async (payload: Omit<HallItem, 'id'>): Promise<void> => {
    const halls = get().halls;
    const newId = halls.length > 0
      ? Math.max(...halls.map((h) => Number(h.id))) + 1
      : 1;
    set((s) => ({ halls: [...s.halls, { ...payload, id: newId, status: 'active' }] }));
  },

  updateHall: async (id: string | number, payload: Partial<HallItem>): Promise<void> => {
    set((s) => ({
      halls: s.halls.map((h) =>
        String(h.id) === String(id) ? { ...h, ...payload } : h,
      ),
    }));
  },

  deleteHall: (id: string | number): void => {
    set((s) => ({ halls: s.halls.filter((h) => String(h.id) !== String(id)) }));
  },
}));
