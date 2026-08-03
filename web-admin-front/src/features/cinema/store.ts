import { create } from 'zustand';
import type { CinemaItem } from './types';
import { mockCinemas } from './mock';

export type { CinemaStatus, CinemaItem } from './types';

interface CinemaState {
  cinemas: CinemaItem[];
  addCinema: (payload: Omit<CinemaItem, 'id'>) => Promise<void>;
  updateCinema: (id: number, payload: Partial<CinemaItem>) => Promise<void>;
  deleteCinema: (id: number) => void;
}

export const useCinemaStore = create<CinemaState>((set, get) => ({
  cinemas: mockCinemas,

  addCinema: async (payload: Omit<CinemaItem, 'id'>): Promise<void> => {
    const newId = get().cinemas.length > 0
      ? Math.max(...get().cinemas.map((c) => c.id)) + 1
      : 1;
    set((s) => ({ cinemas: [...s.cinemas, { ...payload, id: newId }] }));
  },

  updateCinema: async (id: number, payload: Partial<CinemaItem>): Promise<void> => {
    set((s) => ({
      cinemas: s.cinemas.map((c) => (c.id === id ? { ...c, ...payload } : c)),
    }));
  },

  deleteCinema: (id: number): void => {
    set((s) => ({ cinemas: s.cinemas.filter((c) => c.id !== id) }));
  },
}));
