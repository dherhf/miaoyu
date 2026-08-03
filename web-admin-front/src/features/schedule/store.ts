import { useSyncExternalStore } from 'react';
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
}

// ===================== 模块级状态 =====================
let state: ScheduleState = { schedules: mockSchedules };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// ===================== Store Hook =====================
export function useScheduleStore() {
  const snapshot = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );

  const genId = (): string | number => {
    return state.schedules.length > 0
      ? Math.max(...state.schedules.map((s) => Number(s.id))) + 1
      : 1;
  };

  return {
    schedules: snapshot.schedules,

    hasMovieSchedule: (movieId: number | string): boolean => {
      return snapshot.schedules.some(
        (s) => String(s.movieId) === String(movieId) && s.status !== 'cancelled' && s.status !== 'ended',
      );
    },

    addSchedule: (payload: Omit<ScheduleItem, 'id'>): void => {
      state = { schedules: [...state.schedules, { ...payload, id: genId() }] };
      emit();
    },

    updateSchedule: (id: string | number, payload: Partial<ScheduleItem>): void => {
      state = {
        schedules: state.schedules.map((s) =>
          String(s.id) === String(id) ? { ...s, ...payload } : s,
        ),
      };
      emit();
    },

    cancelSchedule: (id: string | number): void => {
      state = {
        schedules: state.schedules.map((s) =>
          String(s.id) === String(id) ? { ...s, status: 'cancelled' as ScheduleStatus } : s,
        ),
      };
      emit();
    },

    deleteSchedule: (id: string | number): void => {
      state = { schedules: state.schedules.filter((s) => String(s.id) !== String(id)) };
      emit();
    },
  };
}
