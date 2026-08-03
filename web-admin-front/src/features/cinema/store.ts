import { create } from 'zustand';
import type { CinemaItem, CinemaStatus, CinemaCreateParams, CinemaListParams } from './types';
import { mapCinemaRecord } from './types';
import {
  getCinemaList,
  createCinema,
  updateCinema,
  closeCinema,
  openCinema,
  deleteCinema,
} from './api';

export type { CinemaStatus, CinemaItem } from './types';

interface CinemaState {
  cinemas: CinemaItem[];
  loading: boolean;
  fetchCinemas: (params?: CinemaListParams) => Promise<void>;
  addCinema: (payload: CinemaCreateParams) => Promise<void>;
  updateCinema: (id: number, payload: CinemaCreateParams) => Promise<void>;
  toggleCinemaStatus: (id: number, target: CinemaStatus) => Promise<void>;
  deleteCinema: (id: number) => Promise<void>;
}

export const useCinemaStore = create<CinemaState>((set, get) => ({
  cinemas: [],
  loading: false,

  fetchCinemas: async (params?: CinemaListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await getCinemaList(params ?? { page: 1, size: 100 });
      set({ cinemas: res.records.map(mapCinemaRecord) });
    } finally {
      set({ loading: false });
    }
  },

  addCinema: async (payload: CinemaCreateParams): Promise<void> => {
    await createCinema(payload);
    await get().fetchCinemas();
  },

  updateCinema: async (id: number, payload: CinemaCreateParams): Promise<void> => {
    await updateCinema(id, payload);
    await get().fetchCinemas();
  },

  toggleCinemaStatus: async (id: number, target: CinemaStatus): Promise<void> => {
    if (target === 'active') {
      await openCinema(id);
    } else {
      await closeCinema(id);
    }
    await get().fetchCinemas();
  },

  deleteCinema: async (id: number): Promise<void> => {
    await deleteCinema(id);
    await get().fetchCinemas();
  },
}));
