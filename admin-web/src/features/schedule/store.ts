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

// ===================== 常量 =====================

/**
 * 场次状态常量
 * available: 可售 / full: 满场 / ended: 已结束 / cancelled: 已取消
 */
export const SCHEDULE_STATUS = {
  AVAILABLE: 'available',
  FULL: 'full',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export type { ScheduleStatus, ScheduleItem } from './types';

/**
 * 场次状态标签配置
 * 映射场次状态到显示文案和颜色
 */
export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, { label: string; color: string }> = {
  available: { label: '可售', color: 'green' },
  full: { label: '满场', color: 'orange' },
  ended: { label: '已结束', color: 'blue' },
  cancelled: { label: '已取消', color: 'gray' },
};

/**
 * 场次状态管理接口
 */
interface ScheduleState {
  /** 场次列表 */
  schedules: ScheduleItem[];
  /** 加载中状态 */
  loading: boolean;
  /** 数据总条数 */
  total: number;
  /** 查询场次列表 */
  fetchSchedules: (params?: ScheduleListParams) => Promise<void>;
  /** 检查影片是否有未结束的场次 */
  hasMovieSchedule: (movieId: string) => boolean;
  /** 新增场次 */
  addSchedule: (payload: ScheduleCreateParams) => Promise<void>;
  /** 修改场次 */
  updateSchedule: (id: string, payload: ScheduleUpdateParams) => Promise<void>;
  /** 取消场次 */
  cancelSchedule: (id: string) => Promise<void>;
  /** 恢复场次 */
  restoreSchedule: (id: string) => Promise<void>;
  /** 删除场次 */
  deleteSchedule: (id: string) => Promise<void>;
}

/**
 * 场次状态管理 Store（Zustand）
 *
 * 管理排期列表和 CRUD 操作：
 * - fetchSchedules：查询列表，结果通过 mapScheduleRecord 转换
 * - hasMovieSchedule：检查影片是否有活跃场次（供影片下架前检查）
 * - addSchedule/updateSchedule/cancelSchedule/restoreSchedule/deleteSchedule：
 *   操作后自动重新拉取列表
 */
export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  loading: false,
  total: 0,

  /**
   * 查询场次列表
   * 无参数时默认查询第一页100条
   */
  fetchSchedules: async (params?: ScheduleListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await scheduleApi.getList(params ?? { page: 1, size: 100 });
      // 将 API 返回的 ScheduleRecord 转换为前端展示用 ScheduleItem
      set({ schedules: res.records.map(mapScheduleRecord), total: res.total });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * 检查影片是否有未结束/未取消的场次
   * 用于影片下架前检查关联场次
   */
  hasMovieSchedule: (movieId: string): boolean => {
    return get().schedules.some(
      (s) => String(s.movieId) === String(movieId) && s.status !== 'cancelled' && s.status !== 'ended',
    );
  },

  /**
   * 新增场次
   * 创建后重新拉取列表
   */
  addSchedule: async (payload: ScheduleCreateParams): Promise<void> => {
    await scheduleApi.create(payload);
    await get().fetchSchedules();
  },

  /**
   * 修改场次
   * 更新后重新拉取列表
   */
  updateSchedule: async (id: string, payload: ScheduleUpdateParams): Promise<void> => {
    await scheduleApi.update(id, payload);
    await get().fetchSchedules();
  },

  /**
   * 取消场次
   * 取消后重新拉取列表
   */
  cancelSchedule: async (id: string): Promise<void> => {
    await scheduleApi.cancel(id);
    await get().fetchSchedules();
  },

  /**
   * 恢复场次（已取消→可售）
   * 恢复后重新拉取列表
   */
  restoreSchedule: async (id: string): Promise<void> => {
    await scheduleApi.restore(id);
    await get().fetchSchedules();
  },

  /**
   * 删除场次
   * 删除后重新拉取列表
   */
  deleteSchedule: async (id: string): Promise<void> => {
    await scheduleApi.delete(id);
    await get().fetchSchedules();
  },
}));
