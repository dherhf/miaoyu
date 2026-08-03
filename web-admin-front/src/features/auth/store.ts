import { useSyncExternalStore } from 'react';
import type { AuthUser } from './types';
import { mockAdmin } from './mock';

export type { AuthUser } from './types';

interface AuthState {
  currentUser: AuthUser | null;
}

// ===================== 模块级状态 =====================
let state: AuthState = {
  currentUser: (() => {
    const saved = localStorage.getItem('adminUser');
    return saved ? JSON.parse(saved) : null;
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

    login: (username: string, password: string): { success: boolean; message?: string } => {
      if (username === 'admin' && password === 'admin123') {
        const token = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(mockAdmin));
        setState({ currentUser: mockAdmin });
        return { success: true };
      }
      return { success: false, message: '用户名或密码错误' };
    },

    logout: (): void => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setState({ currentUser: null });
    },
  };
}
