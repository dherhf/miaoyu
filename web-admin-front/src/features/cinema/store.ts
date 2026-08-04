import { create } from 'zustand';
import type { CinemaItem, CinemaStatus, CinemaCreateParams, CinemaListParams } from './types';
import { mapCinemaRecord } from './types';
import { cinemaApi } from './api';

export type { CinemaStatus, CinemaItem } from './types';

interface CinemaState {
  cinemas: CinemaItem[];
  total: number;
  loading: boolean;
  lastParams: CinemaListParams | undefined;
  fetchCinemas: (params?: CinemaListParams) => Promise<void>;
  addCinema: (payload: CinemaCreateParams) => Promise<void>;
  updateCinema: (id: string, payload: CinemaCreateParams) => Promise<void>;
  toggleCinemaStatus: (id: string, target: CinemaStatus) => Promise<void>;
}

export const useCinemaStore = create<CinemaState>((set, get) => ({
  cinemas: [],
  total: 0,
  loading: false,
  lastParams: undefined,

  fetchCinemas: async (params?: CinemaListParams): Promise<void> => {
    const query = params ?? get().lastParams ?? { page: 1, size: 10 };
    set({ loading: true, lastParams: query });
    try {
      const res = await cinemaApi.getList(query);
      set({ cinemas: res.records.map(mapCinemaRecord), total: res.total });
    } finally {
      set({ loading: false });
    }
  },

  addCinema: async (payload: CinemaCreateParams): Promise<void> => {
    await cinemaApi.create(payload);
    await get().fetchCinemas(get().lastParams);
  },

  updateCinema: async (id: string, payload: CinemaCreateParams): Promise<void> => {
    await cinemaApi.update(id, payload);
    await get().fetchCinemas(get().lastParams);
  },

  toggleCinemaStatus: async (id: string, target: CinemaStatus): Promise<void> => {
    if (target === 'active') {
      await cinemaApi.open(id);
    } else {
      await cinemaApi.close(id);
    }
    await get().fetchCinemas(get().lastParams);
  },


}));
