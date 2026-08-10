import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { App as AntApp } from 'antd';

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

/**
 * 全局消息注入组件
 * 将 antd 的 message 实例注入到全局变量中，
 * 供非组件模块（如 axios 请求/响应拦截器）在组件树之外调用消息提示。
 */
function GlobalMessageSetup() {
  const { message } = AntApp.useApp();
  // 将 antd message 实例存入全局变量
  setGlobalMessage(message);
  return null;
}

/**
 * 登录态恢复组件
 * 应用启动时检查本地是否有持久化的 token，
 * 若有 token 但 profile 为空（页面刷新后），则重新拉取当前管理员信息。
 * token 失效时清除登录态。
 */
function ProfileInitializer() {
  const token = useAuthStore((s) => s.token);
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    if (token) {
      // 有 token 时拉取管理员信息，失败则清除登录态
      authApi.getCurrentAdmin().then(setProfile).catch(() => {
        // token 失效时清除登录态
        useAuthStore.getState().clear();
      });
    }
  }, [token, setProfile]);

  return null;
}

/**
 * 路由鉴权守卫组件
 * 检查用户是否已登录（token 是否存在），
 * 未登录时重定向到登录页。
 *
 * @param children - 受保护的子路由元素
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);

  // 未登录直接跳登录页
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/**
 * 全局路由配置
 * - /login：登录页（无需鉴权）
 * - /：后台主页面（需鉴权 + MainLayout 布局）
 *   - /dashboard：数据看板
 *   - /movies：影片管理
 *   - /cinemas：影院管理
 *   - /halls：影厅管理
 *   - /schedules：场次管理
 *   - /orders：订单明细
 * - *：404 兜底
 * basename: '/admin' 表示所有路由前缀为 /admin
 */
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // 所有后台页面统一鉴权 + 嵌套 MainLayout
    path: '/',
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      // 根路径默认跳转到数据看板
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'movies', element: <MoviePage /> },
      { path: 'cinemas', element: <CinemaPage /> },
      { path: 'halls', element: <HallPage /> },
      { path: 'schedules', element: <SchedulePage /> },
      { path: 'orders', element: <OrderPage /> },
    ],
  },
  // 404 兜底路由
  { path: '*', element: <NotFound /> },
], {
  basename: '/admin',
});

/**
 * 应用根组件
 * 组合全局消息注入、登录态恢复和路由系统
 */
function App() {
  return (
    <>
      {/* 注入 antd message 到全局，供 axios 拦截器使用 */}
      <GlobalMessageSetup />
      {/* 应用启动时恢复登录态（拉取管理员信息） */}
      <ProfileInitializer />
      {/* 路由系统 */}
      <RouterProvider router={router} />
    </>
  );
}

export default App;
