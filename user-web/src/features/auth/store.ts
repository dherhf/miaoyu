import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authApi from './api'
import type { UserInfoVO } from './types'

/** 认证状态接口 */
interface AuthState {
  /** JWT 登录令牌 */
  token: string | null
  /** 当前用户信息 */
  userInfo: UserInfoVO | null
  /** 登录：手机号 + 密码 */
  login: (phone: string, password: string) => Promise<void>
  /** 注册：手机号 + 密码 + 短信验证码 */
  register: (phone: string, password: string, smsCode: string) => Promise<UserInfoVO>
  /** 退出登录 */
  logout: () => Promise<void>
  /** 获取当前用户信息 */
  fetchCurrentUser: () => Promise<void>
}

/**
 * 认证状态 Zustand store。
 * 使用 persist 中间件将 token 持久化到 localStorage，
 * 页面刷新后自动恢复登录态。
 * 仅持久化 token，userInfo 每次通过接口获取。
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userInfo: null,

      // 登录：调用登录接口，保存 token 和用户信息
      login: async (phone, password) => {
        const data = await authApi.login({ phone, password })
        set({ token: data.token, userInfo: data.userInfo })
      },

      // 注册：调用注册接口，返回用户信息（不自动登录）
      register: async (phone, password, smsCode) => {
        return authApi.register({ phone, password, smsCode })
      },

      // 退出登录：无论后端接口是否成功，都清除本地登录态
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          set({ token: null, userInfo: null })
        }
      },

      // 获取当前用户信息并更新 store
      fetchCurrentUser: async () => {
        const userInfo = await authApi.getCurrentUser()
        set({ userInfo })
      },
    }),
    {
      name: 'auth-storage',  // localStorage 存储键名
      // 仅持久化 token，不持久化 userInfo
      partialize: (state) => ({ token: state.token }),
    },
  ),
)
