import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authApi from './api'
import type { UserInfoVO } from './types'

interface AuthState {
  token: string | null
  userInfo: UserInfoVO | null
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, smsCode: string) => Promise<UserInfoVO>
  logout: () => Promise<void>
  fetchCurrentUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userInfo: null,
      login: async (phone, password) => {
        const data = await authApi.login({ phone, password })
        set({ token: data.token, userInfo: data.userInfo })
      },
      register: async (phone, password, smsCode) => {
        return authApi.register({ phone, password, smsCode })
      },
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          set({ token: null, userInfo: null })
        }
      },
      fetchCurrentUser: async () => {
        const userInfo = await authApi.getCurrentUser()
        set({ userInfo })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    },
  ),
)
