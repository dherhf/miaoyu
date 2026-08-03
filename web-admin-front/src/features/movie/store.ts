import { create } from 'zustand';
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

// ===================== Store =====================
interface MovieState {
  movies: MovieItem[];
  filters: MovieFilters;
  sortConfig: string;
  pagination: { page: number; pageSize: number };
  setFilters: (partial: Partial<MovieFilters>) => void;
  setSortConfig: (field: string) => void;
  setPagination: (p: { page: number; pageSize: number }) => void;
  getPaginatedMovies: () => { list: MovieItem[]; total: number };
  addMovie: (payload: Omit<MovieItem, 'id'>) => Promise<void>;
  updateMovie: (id: number | string, payload: Partial<MovieItem>) => Promise<void>;
  batchUpdateStatus: (ids: string[], status: MovieStatus) => void;
}

export const useMovieStore = create<MovieState>((set, get) => ({
  movies: mockMovies,
  filters: { keyword: '', type: undefined as string | undefined, status: undefined as string | undefined },
  sortConfig: 'release_date',
  pagination: { page: 1, pageSize: 10 },

  setFilters: (partial: Partial<MovieFilters>) => {
    set((s) => ({
      filters: { ...s.filters, ...partial },
      pagination: { ...s.pagination, page: 1 },
    }));
  },

  setSortConfig: (field: string) => {
    set({ sortConfig: field });
  },

  setPagination: (p: { page: number; pageSize: number }) => {
    set({ pagination: p });
  },

  getPaginatedMovies: (): { list: MovieItem[]; total: number } => {
    const { movies, filters, sortConfig, pagination } = get();
    let list = [...movies];
    const { keyword, type, status } = filters;
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
    if (sortConfig === 'release_date') {
      list.sort((a, b) => b.release_date.localeCompare(a.release_date));
    } else if (sortConfig === 'rating') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortConfig === 'duration') {
      list.sort((a, b) => b.duration - a.duration);
    }

    const total = list.length;
    const { page, pageSize } = pagination;
    const start = (page - 1) * pageSize;
    return { list: list.slice(start, start + pageSize), total };
  },

  addMovie: async (payload: Omit<MovieItem, 'id'>): Promise<void> => {
    const movies = get().movies;
    const newId = movies.length > 0 ? Math.max(...movies.map((m) => Number(m.id))) + 1 : 1;
    set((s) => ({ movies: [...s.movies, { ...payload, id: newId }] }));
  },

  updateMovie: async (id: number | string, payload: Partial<MovieItem>): Promise<void> => {
    set((s) => ({
      movies: s.movies.map((m) => (String(m.id) === String(id) ? { ...m, ...payload } : m)),
    }));
  },

  batchUpdateStatus: (ids: string[], status: MovieStatus): void => {
    set((s) => ({
      movies: s.movies.map((m) =>
        ids.includes(String(m.id)) ? { ...m, status } : m,
      ),
    }));
  },
}));
