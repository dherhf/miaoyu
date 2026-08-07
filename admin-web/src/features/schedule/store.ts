import { create } from 'zustand';
import type {
  ScheduleStatus,
  ScheduleItem,
  ScheduleListParams,
  ScheduleCreateParams,
  ScheduleUpdateParams,
} from './types';
import { mapScheduleRecord } from './types';
import { scheduleApi } from './api';

// 常量
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
  loading: boolean;
  total: number;
  fetchSchedules: (params?: ScheduleListParams) => Promise<void>;
  hasMovieSchedule: (movieId: string) => boolean;
  addSchedule: (payload: ScheduleCreateParams) => Promise<void>;
  updateSchedule: (id: string, payload: ScheduleUpdateParams) => Promise<void>;
  cancelSchedule: (id: string) => Promise<void>;
  restoreSchedule: (id: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  loading: false,
  total: 0,

  fetchSchedules: async (params?: ScheduleListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await scheduleApi.getList(params ?? { page: 1, size: 100 });
      set({ schedules: res.records.map(mapScheduleRecord), total: res.total });
    } finally {
      set({ loading: false });
    }
  },

  hasMovieSchedule: (movieId: string): boolean => {
    return get().schedules.some(
      (s) => String(s.movieId) === String(movieId) && s.status !== 'cancelled' && s.status !== 'ended',
    );
  },

  addSchedule: async (payload: ScheduleCreateParams): Promise<void> => {
    await scheduleApi.create(payload);
    await get().fetchSchedules();
  },

  updateSchedule: async (id: string, payload: ScheduleUpdateParams): Promise<void> => {
    await scheduleApi.update(id, payload);
    await get().fetchSchedules();
  },

  cancelSchedule: async (id: string): Promise<void> => {
    await scheduleApi.cancel(id);
    await get().fetchSchedules();
  },

  restoreSchedule: async (id: string): Promise<void> => {
    await scheduleApi.restore(id);
    await get().fetchSchedules();
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await scheduleApi.delete(id);
    await get().fetchSchedules();
  },
}));
