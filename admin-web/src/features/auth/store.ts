import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminInfo } from './types';
import { authApi } from './api';

export type { AdminInfo } from './types';

/**
 * 认证状态接口
 * 管理员登录态：token 和 profile
 */
interface AuthState {
  /** 登录令牌（持久化到 localStorage） */
  token: string | null;
  /** 当前管理员信息（每次刷新后重新拉取，不持久化） */
  profile: AdminInfo | null;
  /** 设置 token */
  setToken: (token: string | null) => void;
  /** 设置管理员信息 */
  setProfile: (profile: AdminInfo | null) => void;
  /** 清除所有登录态（token + profile） */
  clear: () => void;
  /** 退出登录（调用后端登出接口 + 清除本地状态） */
  logout: () => Promise<void>;
}

/**
 * 认证状态管理 Store（Zustand + persist 中间件）
 *
 * 持久化策略：
 * - token 持久化到 localStorage（key: 'auth-storage'），页面刷新后保留
 * - profile 不持久化，每次刷新后通过 /auth/me 接口重新拉取
 *
 * 退出登录：
 * - 调用后端 logout 接口使 token 失效
 * - 即使接口失败也清除本地登录态
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,

      /** 设置 token */
      setToken: (token) => set({ token }),

      /** 设置管理员信息 */
      setProfile: (profile) => set({ profile }),

      /** 清除所有登录态 */
      clear: () => set({ token: null, profile: null }),

      /**
       * 退出登录
       * 1. 调用后端 logout 接口使 token 失效
       * 2. 无论接口成功或失败，都清除本地登录态
       */
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
