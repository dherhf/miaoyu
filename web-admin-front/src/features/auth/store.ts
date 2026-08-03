import { useSyncExternalStore } from 'react';
import type { AdminInfo } from './types';
import { login as apiLogin, logout as apiLogout } from './api';

export type { AdminInfo } from './types';

interface AuthState {
  currentUser: AdminInfo | null;
}

// ===================== 模块级状态 =====================
let state: AuthState = {
  currentUser: (() => {
    const saved = localStorage.getItem('adminUser');
    return saved ? (JSON.parse(saved) as AdminInfo) : null;
  })(),
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setState(partial: Partial<AuthState>) {
  state = { ...state, ...partial };
  emit();
}

// ===================== Store Hook =====================
export function useAuthStore() {
  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );

  return {
    currentUser: snapshot.currentUser,

    isLoggedIn: (): boolean => {
      return !!localStorage.getItem('adminToken') && !!snapshot.currentUser;
    },

    login: async (phone: string, password: string): Promise<void> => {
      const result = await apiLogin({ phone, password });
      localStorage.setItem('adminToken', result.token);
      localStorage.setItem('adminUser', JSON.stringify(result.adminInfo));
      setState({ currentUser: result.adminInfo });
    },

    logout: async (): Promise<void> => {
      try {
        await apiLogout();
      } catch {
        // 即使登出接口失败，也清除本地登录态
      }
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setState({ currentUser: null });
    },
  };
}
