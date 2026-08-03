import { useSyncExternalStore } from 'react';
import type { CinemaStatus, CinemaItem } from '../types/cinema';
import { mockCinemas } from '../mock';

export type { CinemaStatus, CinemaItem } from '../types/cinema';

interface CinemaState {
  cinemas: CinemaItem[];
}

// ===================== 模块级状态 =====================
let state: CinemaState = { cinemas: mockCinemas };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// ===================== Store Hook =====================
export function useCinemaStore() {
  const snapshot = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );

  return {
    cinemas: snapshot.cinemas,

    addCinema: async (payload: Omit<CinemaItem, 'id'>): Promise<void> => {
      const newId = state.cinemas.length > 0
        ? Math.max(...state.cinemas.map((c) => c.id)) + 1
        : 1;
      state = { cinemas: [...state.cinemas, { ...payload, id: newId }] };
      emit();
    },

    updateCinema: async (id: number, payload: Partial<CinemaItem>): Promise<void> => {
      state = {
        cinemas: state.cinemas.map((c) =>
          c.id === id ? { ...c, ...payload } : c,
        ),
      };
      emit();
    },

    deleteCinema: (id: number): void => {
      state = { cinemas: state.cinemas.filter((c) => c.id !== id) };
      emit();
    },
  };
}
