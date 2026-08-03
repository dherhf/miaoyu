import { createBrowserRouter, Navigate } from 'react-router-dom';

// 布局文件
import MainLayout from '../layouts/MainLayout';

// 页面组件
import LoginPage from '../pages/login/login';
import Dashboard from '../pages/Dashboard/Dashboard';
import Movie from '../pages/Movie/Movie';
import Cinema from '../pages/cinemas/cinemas';
import Hall from '../pages/halls/halls';
import Schedule from '../pages/schedules/schedules';
import Order from '../pages/Order/Order';
import NotFound from '../pages/NotFound';

// 鉴权守卫（内联组件，避免跨文件依赖 store 导入路径）
import { useAuthStore } from '../stores/authStore';
import type React from 'react';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/** 全局路由配置 */
export const router = createBrowserRouter([
  // ----- 公开路由 -----
  { path: '/login', element: <LoginPage /> },

  // ----- 鉴权后台路由 -----
  {
    path: '/',
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'movies', element: <Movie /> },
      { path: 'cinemas', element: <Cinema /> },
      { path: 'halls', element: <Hall /> },
      { path: 'schedules', element: <Schedule /> },
      { path: 'orders', element: <Order /> },
    ],
  },

  // ----- 404 兜底 -----
  { path: '*', element: <NotFound /> },
]);
