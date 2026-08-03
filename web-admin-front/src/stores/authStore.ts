import { useSyncExternalStore } from 'react';
import type { AuthUser, UserRole } from '../types/auth';
import { mockAdmin } from '../mock';

// ===================== 常量 =====================
export const USER_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
} as const;

export type { UserRole, AuthUser } from '../types/auth';

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
