import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';

// 布局文件
import { MainLayout } from '@/layouts/index';

// 页面组件
import { LoginPage } from '@/features/auth';
import { DashboardPage } from '@/features/dashboard';
import { MoviePage } from '@/features/movie';
import { CinemaPage } from '@/features/cinema';
import { HallPage } from '@/features/hall';
import { SchedulePage } from '@/features/schedule';
import { OrderPage } from '@/features/order';
import NotFound from '@/pages/NotFound';

// 状态管理
import { useAuthStore, authApi } from '@/features/auth';
import GlobalMessage from '@/shared/utils/globalMessage';
import React, { useEffect } from "react";

/** 登录态恢复：有 token 但无 profile 时重新拉取 */
function ProfileInitializer() {
  const token = useAuthStore((s) => s.token);
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    if (token) {
      authApi.getCurrentAdmin().then(setProfile).catch(() => {
        // token 失效时清除登录态
        useAuthStore.getState().clear();
      });
    }
  }, [token, setProfile]);

  return null;
}

/** 路由鉴权守卫组件 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);

  // 未登录直接跳登录页
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// 全局路由配置
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // 所有后台页面统一鉴权 + 嵌套AdminLayout
    path: '/',
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'movies', element: <MoviePage /> },
      { path: 'cinemas', element: <CinemaPage /> },
      { path: 'halls', element: <HallPage /> },
      { path: 'schedules', element: <SchedulePage /> },
      { path: 'orders', element: <OrderPage /> },
    ],
  },
  // 404兜底路由
  { path: '*', element: <NotFound /> },
], {
  basename: '/admin',
});

function App() {
  return (
    <>
      <GlobalMessage />
      <ProfileInitializer />
      <RouterProvider router={router} />
    </>
  );
}

export default App;