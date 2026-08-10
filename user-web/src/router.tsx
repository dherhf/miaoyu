import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage, RegisterPage, ResetPasswordPage } from './features/auth'
import { HomePage } from './home'
import { MovieListPage, MovieDetailPage } from './features/movie'
import { OrderListPage } from './features/order'
import { ChatPage } from './features/agent'
import ProtectedRoute from './shared/ProtectedRoute'
import { MainLayout } from './layouts'

/**
 * 应用路由配置。
 * 所有路由均嵌套在 MainLayout 下（共享 Header/Footer）。
 * 需要登录的页面使用 ProtectedRoute 包裹，未登录时自动跳转登录页。
 * 未匹配路由统一重定向到首页。
 */
export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      // 登录页（无需鉴权）
      {
        path: '/login',
        element: <LoginPage />,
      },
      // 注册页（无需鉴权）
      {
        path: '/register',
        element: <RegisterPage />,
      },
      // 重置密码页（无需鉴权）
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
      // 首页（需登录）
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      // 影片列表页（需登录）
      {
        path: '/movies',
        element: (
          <ProtectedRoute>
            <MovieListPage />
          </ProtectedRoute>
        ),
      },
      // 影片详情页（需登录，:id 为影片ID）
      {
        path: '/movies/:id',
        element: (
          <ProtectedRoute>
            <MovieDetailPage />
          </ProtectedRoute>
        ),
      },
      // 订单列表页（需登录）
      {
        path: '/orders',
        element: (
          <ProtectedRoute>
            <OrderListPage />
          </ProtectedRoute>
        ),
      },
      // AI 对话页（需登录）
      {
        path: '/chat',
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        ),
      },
      // AI 对话页 - 指定会话ID（需登录）
      {
        path: '/chat/:id',
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        ),
      },
      // 兜底：未匹配路由重定向到首页
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
