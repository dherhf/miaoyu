import { create } from 'zustand';
import type { AdminInfo } from './types';
import { login as apiLogin, logout as apiLogout } from './api';

export type { AdminInfo } from './types';

interface AuthState {
  currentUser: AdminInfo | null;
  isLoggedIn: () => boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: (() => {
    const saved = localStorage.getItem('adminUser');
    return saved ? (JSON.parse(saved) as AdminInfo) : null;
  })(),

  isLoggedIn: (): boolean => {
    return !!localStorage.getItem('adminToken') && !!get().currentUser;
  },

  login: async (phone: string, password: string): Promise<void> => {
    const result = await apiLogin({ phone, password });
    localStorage.setItem('adminToken', result.token);
    localStorage.setItem('adminUser', JSON.stringify(result.adminInfo));
    set({ currentUser: result.adminInfo });
  },

  logout: async (): Promise<void> => {
    try {
      await apiLogout();
    } catch {
      // 即使登出接口失败，也清除本地登录态
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    set({ currentUser: null });
  },
}));
