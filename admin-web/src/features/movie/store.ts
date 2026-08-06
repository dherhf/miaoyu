import { create } from 'zustand';
import type { MovieStatus, MovieItem, MovieListParams, MovieCreateParams, MovieDetail, BatchResult } from './types';
import { mapMovieRecord } from './types';
import { movieApi } from './api';

// ===================== 常量 =====================
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
interface MovieState {
  movies: MovieItem[];
  loading: boolean;
  total: number;
  /** 当前查询参数（供 re-fetch 时复用） */
  lastParams: MovieListParams | undefined;
  fetchMovies: (params?: MovieListParams) => Promise<void>;
  addMovie: (payload: MovieCreateParams) => Promise<MovieDetail>;
  editMovie: (id: string, payload: MovieCreateParams) => Promise<void>;
  toggleStatus: (ids: string[], target: MovieStatus) => Promise<BatchResult>;
}

export const useMovieStore = create<MovieState>((set, get) => ({
  movies: [],
  loading: false,
  total: 0,
  lastParams: undefined,

  fetchMovies: async (params?: MovieListParams): Promise<void> => {
    const query = params ?? get().lastParams ?? { page: 1, size: 10 };
    set({ loading: true, lastParams: query });
    try {
      const res = await movieApi.getMovieList(query);
      set({
        movies: res.records.map(mapMovieRecord),
        total: res.total,
      });
    } finally {
      set({ loading: false });
    }
  },

  addMovie: async (payload: MovieCreateParams): Promise<MovieDetail> => {
    const detail = await movieApi.createMovie(payload);
    await get().fetchMovies();
    return detail;
  },

  editMovie: async (id: string, payload: MovieCreateParams): Promise<void> => {
    await movieApi.updateMovie(id, payload);
    await get().fetchMovies();
  },

  toggleStatus: async (ids: string[], target: MovieStatus): Promise<BatchResult> => {
    let result: BatchResult;
    if (target === 'showing') {
      if (ids.length === 1) {
        await movieApi.publishMovie(ids[0]);
        result = { successIds: ids, failIds: [], failReasons: {} };
      } else {
        result = await movieApi.batchPublishMovies(ids);
      }
    } else {
      if (ids.length === 1) {
        await movieApi.unpublishMovie(ids[0]);
        result = { successIds: ids, failIds: [], failReasons: {} };
      } else {
        result = await movieApi.batchUnpublishMovies(ids);
      }
    }
    await get().fetchMovies();
    return result;
  },
}));
