/**
 * 认证模块统一导出
 * 导出登录页组件、auth store、API 和类型定义
 */

// 登录页组件
export { LoginPage } from './LoginPage';

// 认证状态管理（Zustand store）
export { useAuthStore } from './store';

// 认证 API
export { authApi } from './api';

// 类型定义
export type { LoginParams, AdminInfo, LoginResult } from './types';
