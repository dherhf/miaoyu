import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth'

/**
 * 路由鉴权守卫组件。
 * 检查用户是否已登录（token 是否存在），
 * 未登录时重定向到登录页，已登录则渲染子组件。
 * @param children 受保护的页面组件
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  // 未登录则跳转登录页
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
