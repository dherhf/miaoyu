import { create } from 'zustand';
import type { MovieStatus, MovieItem, MovieListParams, MovieCreateParams, MovieDetail, BatchResult } from './types';
import { mapMovieRecord } from './types';
import { movieApi } from './api';

// ===================== 常量 =====================

/**
 * 影片类型列表
 * value/label 均为中文，用于影片类型多选
 */
export const MOVIE_TYPES = [
  { value: '科幻', label: '科幻' },
  { value: '动作', label: '动作' },
  { value: '喜剧', label: '喜剧' },
  { value: '爱情', label: '爱情' },
  { value: '悬疑', label: '悬疑' },
  { value: '动画', label: '动画' },
  { value: '纪录片', label: '纪录片' },
  { value: '其他', label: '其他' },
];

export type { MovieStatus, MovieItem, MovieListParams, MovieCreateParams, BatchResult } from './types';

// ===================== Store =====================

/**
 * 影片状态管理接口
 */
interface MovieState {
  /** 影片列表 */
  movies: MovieItem[];
  /** 加载中状态 */
  loading: boolean;
  /** 数据总条数 */
  total: number;
  /** 当前查询参数（供 re-fetch 时复用） */
  lastParams: MovieListParams | undefined;
  /** 查询影片列表 */
  fetchMovies: (params?: MovieListParams) => Promise<void>;
  /** 新增影片 */
  addMovie: (payload: MovieCreateParams) => Promise<MovieDetail>;
  /** 编辑影片 */
  editMovie: (id: string, payload: MovieCreateParams) => Promise<void>;
  /** 批量上下架 */
  toggleStatus: (ids: string[], target: MovieStatus) => Promise<BatchResult>;
}

/**
 * 影片状态管理 Store（Zustand）
 *
 * 影片 CRUD 操作：
 * - fetchMovies：查询列表，结果通过 mapMovieRecord 转换
 * - addMovie：创建后重新拉取列表
 * - editMovie：更新后重新拉取列表
 * - toggleStatus：单条走 publish/unpublish 接口，批量走 batch 接口
 */
export const useMovieStore = create<MovieState>((set, get) => ({
  movies: [],
  loading: false,
  total: 0,
  lastParams: undefined,

  /**
   * 查询影片列表
   * 无参数时使用上次查询参数，默认查询第一页
   */
  fetchMovies: async (params?: MovieListParams): Promise<void> => {
    const query = params ?? get().lastParams ?? { page: 1, size: 10 };
    set({ loading: true, lastParams: query });
    try {
      const res = await movieApi.getMovieList(query);
      // 将 API 返回的 MovieRecord 转换为前端展示用 MovieItem
      set({
        movies: res.records.map(mapMovieRecord),
        total: res.total,
      });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * 新增影片
   * 创建后重新拉取列表，返回新创建的影片详情
   */
  addMovie: async (payload: MovieCreateParams): Promise<MovieDetail> => {
    const detail = await movieApi.createMovie(payload);
    await get().fetchMovies();
    return detail;
  },

  /**
   * 编辑影片
   * 更新后重新拉取列表
   */
  editMovie: async (id: string, payload: MovieCreateParams): Promise<void> => {
    await movieApi.updateMovie(id, payload);
    await get().fetchMovies();
  },

  /**
   * 批量上下架
   * - 单条：调用 publishMovie / unpublishMovie 接口
   * - 多条：调用 batchPublishMovies / batchUnpublishMovies 接口
   * 操作后重新拉取列表
   */
  toggleStatus: async (ids: string[], target: MovieStatus): Promise<BatchResult> => {
    let result: BatchResult;
    if (target === 'showing') {
      // 上架
      if (ids.length === 1) {
        // 单条上架
        await movieApi.publishMovie(ids[0]);
        result = { successIds: ids, failIds: [], failReasons: {} };
      } else {
        // 批量上架
        result = await movieApi.batchPublishMovies(ids);
      }
    } else {
      // 下架
      if (ids.length === 1) {
        // 单条下架
        await movieApi.unpublishMovie(ids[0]);
        result = { successIds: ids, failIds: [], failReasons: {} };
      } else {
        // 批量下架
        result = await movieApi.batchUnpublishMovies(ids);
      }
    }
    await get().fetchMovies();
    return result;
  },
}));
