/**
 * Axios 请求实例及拦截器配置
 *
 * - 创建带 baseURL 和超时的 axios 实例
 * - 请求拦截器：自动注入 Bearer Token（从 auth store 获取）
 * - 响应拦截器：统一处理业务错误码和 HTTP 错误状态码
 *   - code=0 表示业务成功，返回 data
 *   - code=401 或 HTTP 401：清除登录态，跳转登录页
 *   - 其他错误：通过全局 message 提示用户
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getGlobalMessage } from './globalMessage';
import { useAuthStore } from '../../features/auth';

// ==================== 通用 API 响应类型 ====================

/** 后端统一响应格式 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码，0=成功 */
  code: number;
  /** 提示消息 */
  message: string;
  /** 业务数据 */
  data: T;
}

/** 分页查询结果 */
export interface PageResult<T> {
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  size: number;
  /** 当前页数据列表 */
  records: T[];
}

// ==================== Axios 实例创建 ====================

/**
 * Axios 请求实例
 * baseURL: /api/v1/admin（所有管理后台 API 统一前缀）
 * timeout: 15000ms（15秒超时）
 */
const request = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ==================== 请求拦截器 ====================

/**
 * 请求拦截器
 * 在每个请求头中自动注入 Authorization: Bearer {token}
 * token 从 auth store 获取（Zustand 的 getState 非响应式读取）
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 auth store 获取 token
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      // 注入 Bearer Token
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ==================== 响应拦截器 ====================

/**
 * 响应拦截器
 * 统一处理后端响应：
 * - code=0：业务成功，直接返回 data
 * - code=401：登录态失效，清除 store 并跳转登录页
 * - 其他 code：业务错误，通过全局 message 提示
 */
request.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse;

    // 业务成功：直接返回 data 部分
    if (res.code === 0) {
      return res.data as any;
    }

    // 业务错误
    const errMsg = res.message || '操作失败，请稍后重试';

    // 401 → 登录态失效，清除并跳转登录页
    if (res.code === 401) {
      useAuthStore.getState().clear();
      window.location.href = '/admin/login';
      return Promise.reject(new Error('未登录或登录已过期'));
    }

    // 其他业务错误：全局提示
    getGlobalMessage()?.error(errMsg);
    return Promise.reject(new Error(errMsg));
  },
  (error: AxiosError<ApiResponse>) => {
    // HTTP 状态码错误（非 2xx 响应）
    const status = error.response?.status;
    const serverMsg = error.response?.data?.message;

    let message = '网络异常，请稍后重试';

    // 根据 HTTP 状态码映射错误提示
    switch (status) {
      case 400:
        message = serverMsg || '请求参数错误';
        break;
      case 401:
        // 未授权：清除登录态并跳转
        useAuthStore.getState().clear();
        window.location.href = '/admin/login';
        message = '未登录或登录已过期';
        break;
      case 403:
        message = serverMsg || '权限不足或账号已锁定';
        break;
      case 404:
        message = serverMsg || '请求的资源不存在';
        break;
      case 409:
        message = serverMsg || '业务冲突，请稍后重试';
        break;
      case 500:
        message = '系统繁忙，请稍后重试';
        break;
    }

    // 全局提示错误信息
    getGlobalMessage()?.error(message);
    return Promise.reject(new Error(message));
  },
);

export default request;
