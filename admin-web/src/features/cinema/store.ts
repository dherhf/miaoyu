import { create } from 'zustand';
import type { CinemaItem, CinemaStatus, CinemaCreateParams, CinemaListParams } from './types';
import { mapCinemaRecord } from './types';
import { cinemaApi } from './api';

export type { CinemaStatus, CinemaItem } from './types';

/**
 * 影院状态管理接口
 */
interface CinemaState {
  /** 影院列表 */
  cinemas: CinemaItem[];
  /** 数据总条数 */
  total: number;
  /** 加载中状态 */
  loading: boolean;
  /** 上次查询参数（供 re-fetch 时复用） */
  lastParams: CinemaListParams | undefined;
  /** 查询影院列表 */
  fetchCinemas: (params?: CinemaListParams) => Promise<void>;
  /** 新增影院 */
  addCinema: (payload: CinemaCreateParams) => Promise<void>;
  /** 更新影院信息 */
  updateCinema: (id: string, payload: CinemaCreateParams) => Promise<void>;
  /** 切换影院营业/停业状态 */
  toggleCinemaStatus: (id: string, target: CinemaStatus) => Promise<void>;
}

/**
 * 影院状态管理 Store（Zustand）
 *
 * 管理影院列表数据和 CRUD 操作：
 * - fetchCinemas：查询列表，结果通过 mapCinemaRecord 转换为前端展示格式
 * - addCinema/updateCinema：操作后自动重新拉取列表
 * - toggleCinemaStatus：根据目标状态调用 open/close 接口
 */
export const useCinemaStore = create<CinemaState>((set, get) => ({
  cinemas: [],
  total: 0,
  loading: false,
  lastParams: undefined,

  /**
   * 查询影院列表
   * 无参数时使用上次查询参数，默认查询第一页
   */
  fetchCinemas: async (params?: CinemaListParams): Promise<void> => {
    const query = params ?? get().lastParams ?? { page: 1, size: 10 };
    set({ loading: true, lastParams: query });
    try {
      const res = await cinemaApi.getList(query);
      // 将 API 返回的 CinemaRecord 转换为前端展示用 CinemaItem
      set({ cinemas: res.records.map(mapCinemaRecord), total: res.total });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * 新增影院
   * 创建成功后重新拉取当前列表
   */
  addCinema: async (payload: CinemaCreateParams): Promise<void> => {
    await cinemaApi.create(payload);
    await get().fetchCinemas(get().lastParams);
  },

  /**
   * 更新影院信息
   * 更新成功后重新拉取当前列表
   */
  updateCinema: async (id: string, payload: CinemaCreateParams): Promise<void> => {
    await cinemaApi.update(id, payload);
    await get().fetchCinemas(get().lastParams);
  },

  /**
   * 切换影院营业/停业状态
   * active → 调用 open 接口
   * closed → 调用 close 接口
   * 操作后重新拉取当前列表
   */
  toggleCinemaStatus: async (id: string, target: CinemaStatus): Promise<void> => {
    if (target === 'active') {
      await cinemaApi.open(id);
    } else {
      await cinemaApi.close(id);
    }
    await get().fetchCinemas(get().lastParams);
  },
}));
