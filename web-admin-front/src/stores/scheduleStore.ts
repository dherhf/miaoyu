import { useSyncExternalStore } from 'react';

// ===================== 常量 =====================
export const SCHEDULE_STATUS = {
  AVAILABLE: 'available',
  FULL: 'full',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export type ScheduleStatus = (typeof SCHEDULE_STATUS)[keyof typeof SCHEDULE_STATUS];

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, { label: string; color: string }> = {
  available: { label: '可售', color: 'green' },
  full: { label: '满场', color: 'orange' },
  ended: { label: '已结束', color: 'blue' },
  cancelled: { label: '已取消', color: 'gray' },
};

// ===================== 类型 =====================
export interface ScheduleItem {
  id: string | number;
  cinemaId: string | number;
  cinemaName: string;
  hallId: string | number;
  hallName: string;
  movieId: string | number;
  movieName: string;
  showDate: string;
  showTime: string;
  endTime: string;
  price: number;
  vipPrice?: number;
  languageVersion: string;
  totalSeats: number;
  soldSeats: number;
  availableSeats: number;
  status: ScheduleStatus;
}

interface ScheduleState {
  schedules: ScheduleItem[];
}

// ===================== Mock 数据 =====================
function buildMockSchedules(): ScheduleItem[] {
  const today = '2026-08-03';
  const tomorrow = '2026-08-04';
  const dayAfter = '2026-08-05';
  return [
    {
      id: 1, cinemaId: 1, cinemaName: '万达影城', hallId: 1, hallName: 'IMAX 1号厅',
      movieId: 1, movieName: '流浪地球3',
      showDate: today, showTime: '10:30', endTime: '13:23',
      price: 89.9, languageVersion: 'chinese_imax',
      totalSeats: 108, soldSeats: 45, availableSeats: 63,
      status: 'available',
    },
    {
      id: 2, cinemaId: 1, cinemaName: '万达影城', hallId: 1, hallName: 'IMAX 1号厅',
      movieId: 1, movieName: '流浪地球3',
      showDate: today, showTime: '14:00', endTime: '16:53',
      price: 99.9, languageVersion: 'chinese_imax',
      totalSeats: 108, soldSeats: 92, availableSeats: 16,
      status: 'available',
    },
    {
      id: 3, cinemaId: 1, cinemaName: '万达影城', hallId: 2, hallName: '杜比全景声厅',
      movieId: 2, movieName: '哪吒之魔童闹海',
      showDate: today, showTime: '19:30', endTime: '21:54',
      price: 69.9, languageVersion: 'chinese_3d',
      totalSeats: 72, soldSeats: 72, availableSeats: 0,
      status: 'full',
    },
    {
      id: 4, cinemaId: 2, cinemaName: 'CGV影城', hallId: 4, hallName: 'IMAX激光厅',
      movieId: 4, movieName: '封神第二部',
      showDate: today, showTime: '20:00', endTime: '22:30',
      price: 109.9, languageVersion: 'chinese_imax',
      totalSeats: 108, soldSeats: 30, availableSeats: 78,
      status: 'available',
    },
    {
      id: 5, cinemaId: 2, cinemaName: 'CGV影城', hallId: 5, hallName: '1号标准厅',
      movieId: 3, movieName: '唐人街探案4',
      showDate: tomorrow, showTime: '15:00', endTime: '17:12',
      price: 59.9, languageVersion: 'chinese_2d',
      totalSeats: 68, soldSeats: 12, availableSeats: 56,
      status: 'available',
    },
    {
      id: 6, cinemaId: 3, cinemaName: '大地影院', hallId: 6, hallName: '巨幕厅',
      movieId: 6, movieName: '热辣滚烫2',
      showDate: dayAfter, showTime: '18:00', endTime: '20:09',
      price: 49.9, languageVersion: 'chinese_2d',
      totalSeats: 90, soldSeats: 0, availableSeats: 90,
      status: 'available',
    },
    {
      id: 7, cinemaId: 1, cinemaName: '万达影城', hallId: 2, hallName: '杜比全景声厅',
      movieId: 7, movieName: '志愿军：存亡之战',
      showDate: '2026-08-01', showTime: '13:00', endTime: '15:35',
      price: 59.9, languageVersion: 'chinese_2d',
      totalSeats: 72, soldSeats: 20, availableSeats: 0,
      status: 'ended',
    },
    {
      id: 8, cinemaId: 4, cinemaName: '百老汇影城', hallId: 7, hallName: 'VIP贵宾厅',
      movieId: 1, movieName: '流浪地球3',
      showDate: '2026-08-02', showTime: '10:00', endTime: '12:53',
      price: 149.9, languageVersion: 'chinese_2d',
      totalSeats: 28, soldSeats: 0, availableSeats: 0,
      status: 'cancelled',
    },
  ];
}

// ===================== 模块级状态 =====================
let state: ScheduleState = { schedules: buildMockSchedules() };

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
