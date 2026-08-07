import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

// 布局文件
import { MainLayout } from './layouts';

// 页面组件
import { LoginPage } from './features/auth';
import { DashboardPage } from './features/dashboard';
import { MoviePage } from './features/movie';
import { CinemaPage } from './features/cinema';
import { HallPage } from './features/hall';
import { SchedulePage } from './features/schedule';
import { OrderPage } from './features/order';
import NotFound from './pages/NotFound';

// 状态管理
import { useAuthStore, authApi } from './features/auth';
import { setGlobalMessage } from './shared/utils/globalMessage';
import React, { useEffect } from "react";

/** 将 antd message 实例注入全局，供非组件模块（如 axios 拦截器）使用 */
function GlobalMessageSetup() {
  const { message } = AntApp.useApp();
  setGlobalMessage(message);
  return null;
}

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
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        }}}
      >
        <AntApp>
          <GlobalMessageSetup />
          <ProfileInitializer />
          {/* 路由根入口 */}
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
  );
}

export default App;