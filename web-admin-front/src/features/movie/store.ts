import { create } from 'zustand';
import type { MovieStatus, MovieItem, MovieListParams, MovieCreateParams, MovieDetail, BatchResult } from './types';
import { mapMovieRecord } from './types';
import { movieApi } from './api';

// ===================== 常量 =====================
export const MOVIE_TYPES = [
  { value: 'scifi', label: '科幻' },
  { value: 'action', label: '动作' },
  { value: 'comedy', label: '喜剧' },
  { value: 'romance', label: '爱情' },
  { value: 'suspense', label: '悬疑' },
  { value: 'animation', label: '动画' },
  { value: 'documentary', label: '纪录片' },
  { value: 'other', label: '其他' },
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
  editMovie: (id: number, payload: MovieCreateParams) => Promise<void>;
  toggleStatus: (ids: number[], target: MovieStatus) => Promise<BatchResult>;
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

  editMovie: async (id: number, payload: MovieCreateParams): Promise<void> => {
    await movieApi.updateMovie(id, payload);
    await get().fetchMovies();
  },

  toggleStatus: async (ids: number[], target: MovieStatus): Promise<BatchResult> => {
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
