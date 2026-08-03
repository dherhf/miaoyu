import React from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import { Toaster } from 'sonner';

// 布局文件
import MainLayout from './layouts/MainLayout';

// 页面组件
import LoginPage from './pages/login/login';
import Dashboard from './pages/Dashboard/Dashboard';
import Movie from './pages/Movie/Movie';
import Cinema from './pages/cinemas/cinemas';
import Hall from './pages/halls/halls';
import Schedule from './pages/schedules/schedules';
import Order from './pages/Order/Order';
import NotFound from './pages/NotFound';

// 状态管理
import { useAuthStore } from './stores/authStore';

/** 路由鉴权守卫组件 */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuthStore();

  // 未登录直接跳登录页
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

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
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'movies', element: <Movie /> },
      { path: 'cinemas', element: <Cinema /> },
      { path: 'halls', element: <Hall /> },
      { path: 'schedules', element: <Schedule /> },
      { path: 'orders', element: <Order /> },
    ],
  },
  // 404兜底路由
  { path: '*', element: <NotFound /> },
]);

const App: React.FC = () => {
  return (
    <React.StrictMode>
      {/* antd全局配置：中文、主色调 */}
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          }}}
      >
        {/* 路由根入口 */}
        <RouterProvider router={router} />

        {/* 全局消息弹窗 */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
        />
      </ConfigProvider>
    </React.StrictMode>
  );
};

export default App;