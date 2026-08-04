import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminInfo } from './types';
import { authApi } from './api';

export type { AdminInfo } from './types';

interface AuthState {
  token: string | null;
  profile: AdminInfo | null;
  setToken: (token: string | null) => void;
  setProfile: (profile: AdminInfo | null) => void;
  clear: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      setToken: (token) => set({ token }),
      setProfile: (profile) => set({ profile }),
      clear: () => set({ token: null, profile: null }),
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // 即使登出接口失败，也清除本地登录态
        }
        set({ token: null, profile: null });
      },
    }),
    {
      name: 'auth-storage',
      // 只持久化 token，profile 每次刷新后重新拉取
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
