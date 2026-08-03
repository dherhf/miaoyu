import { useSyncExternalStore } from 'react';
import type { MovieStatus, MovieItem, MovieFilters } from './types';
import { mockMovies } from './mock';

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

export type { MovieStatus, MovieItem, MovieFilters } from './types';

interface MovieState {
  movies: MovieItem[];
  filters: MovieFilters;
  sortConfig: string;
  pagination: { page: number; pageSize: number };
}

// ===================== 模块级状态 =====================
let state: MovieState = {
  movies: mockMovies,
  filters: { keyword: '', type: undefined as string | undefined, status: undefined as string | undefined },
  sortConfig: 'release_date',
  pagination: { page: 1, pageSize: 10 },
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// ===================== Store Hook =====================
export function useMovieStore() {
  const snapshot = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );

  return {
    movies: snapshot.movies,
    filters: snapshot.filters,
    sortConfig: snapshot.sortConfig,
    pagination: snapshot.pagination,

    setFilters: (partial: Partial<MovieFilters>) => {
      state = { ...state, filters: { ...state.filters, ...partial }, pagination: { ...state.pagination, page: 1 } };
      emit();
    },

    setSortConfig: (field: string) => {
      state = { ...state, sortConfig: field };
      emit();
    },

    setPagination: (p: { page: number; pageSize: number }) => {
      state = { ...state, pagination: p };
      emit();
    },

    getPaginatedMovies: (): { list: MovieItem[]; total: number } => {
      let list = [...state.movies];
      const { keyword, type, status } = state.filters;
      if (keyword) {
        const kw = keyword.toLowerCase();
        list = list.filter((m) =>
          m.name.toLowerCase().includes(kw) ||
          m.director.toLowerCase().includes(kw) ||
          m.actors.toLowerCase().includes(kw),
        );
      }
      if (type) list = list.filter((m) => m.types.includes(type));
      if (status) list = list.filter((m) => m.status === status);

      // sort
      if (state.sortConfig === 'release_date') {
        list.sort((a, b) => b.release_date.localeCompare(a.release_date));
      } else if (state.sortConfig === 'rating') {
        list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      } else if (state.sortConfig === 'duration') {
        list.sort((a, b) => b.duration - a.duration);
      }

      const total = list.length;
      const { page, pageSize } = state.pagination;
      const start = (page - 1) * pageSize;
      return { list: list.slice(start, start + pageSize), total };
    },

    addMovie: async (payload: Omit<MovieItem, 'id'>): Promise<void> => {
      const newId = state.movies.length > 0 ? Math.max(...state.movies.map((m) => Number(m.id))) + 1 : 1;
      state = { ...state, movies: [...state.movies, { ...payload, id: newId }] };
      emit();
    },

    updateMovie: async (id: number | string, payload: Partial<MovieItem>): Promise<void> => {
      state = {
        ...state,
        movies: state.movies.map((m) => (String(m.id) === String(id) ? { ...m, ...payload } : m)),
      };
      emit();
    },

    batchUpdateStatus: (ids: string[], status: MovieStatus): void => {
      state = {
        ...state,
        movies: state.movies.map((m) =>
          ids.includes(String(m.id)) ? { ...m, status } : m,
        ),
      };
      emit();
    },
  };
}
