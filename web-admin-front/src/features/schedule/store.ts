import { create } from 'zustand';
import type { ScheduleStatus, ScheduleItem } from './types';
import { mockSchedules } from './mock';

// ===================== 常量 =====================
export const SCHEDULE_STATUS = {
  AVAILABLE: 'available',
  FULL: 'full',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export type { ScheduleStatus, ScheduleItem } from './types';

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, { label: string; color: string }> = {
  available: { label: '可售', color: 'green' },
  full: { label: '满场', color: 'orange' },
  ended: { label: '已结束', color: 'blue' },
  cancelled: { label: '已取消', color: 'gray' },
};

interface ScheduleState {
  schedules: ScheduleItem[];
  hasMovieSchedule: (movieId: number | string) => boolean;
  addSchedule: (payload: Omit<ScheduleItem, 'id'>) => void;
  updateSchedule: (id: string | number, payload: Partial<ScheduleItem>) => void;
  cancelSchedule: (id: string | number) => void;
  deleteSchedule: (id: string | number) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: mockSchedules,

  hasMovieSchedule: (movieId: number | string): boolean => {
    return get().schedules.some(
      (s) => String(s.movieId) === String(movieId) && s.status !== 'cancelled' && s.status !== 'ended',
    );
  },

  addSchedule: (payload: Omit<ScheduleItem, 'id'>): void => {
    const genId = (): string | number => {
      const schedules = get().schedules;
      return schedules.length > 0
        ? Math.max(...schedules.map((s) => Number(s.id))) + 1
        : 1;
    };
    set((s) => ({ schedules: [...s.schedules, { ...payload, id: genId() }] }));
  },

  updateSchedule: (id: string | number, payload: Partial<ScheduleItem>): void => {
    set((s) => ({
      schedules: s.schedules.map((sc) =>
        String(sc.id) === String(id) ? { ...sc, ...payload } : sc,
      ),
    }));
  },

  cancelSchedule: (id: string | number): void => {
    set((s) => ({
      schedules: s.schedules.map((sc) =>
        String(sc.id) === String(id) ? { ...sc, status: 'cancelled' as ScheduleStatus } : sc,
      ),
    }));
  },

  deleteSchedule: (id: string | number): void => {
    set((s) => ({ schedules: s.schedules.filter((sc) => String(sc.id) !== String(id)) }));
  },
}));
