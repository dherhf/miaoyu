import { useSyncExternalStore } from 'react';

// ===================== 类型定义 =====================
export const USER_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export interface AuthUser {
  id: number;
  username: string;
  realName: string;
  avatar?: string;
  role: UserRole;
}

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

// ===================== Mock 管理员 =====================
const MOCK_ADMIN: AuthUser = {
  id: 1,
  username: 'admin',
  realName: '系统管理员',
  role: USER_ROLE.SUPER_ADMIN,
};

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
        localStorage.setItem('adminUser', JSON.stringify(MOCK_ADMIN));
        setState({ currentUser: MOCK_ADMIN });
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
