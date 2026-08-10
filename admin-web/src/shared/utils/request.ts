import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { message } from '@/shared/utils/globalMessage';
import { useAuthStore } from '@/features/auth';

// 通用 API 响应类型

/** 后端统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页查询结果 */
export interface PageResult<T> {
  total: number;
  page: number;
  size: number;
  records: T[];
}

// Axios 实例
const request = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 注入 Token
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse;

    // 业务成功
    if (res.code === 0) {
      return res.data as any;
    }

    // 业务错误
    const errMsg = res.message || '操作失败，请稍后重试';

    // 401 → 清除登录态跳转
    if (res.code === 401) {
      useAuthStore.getState().clear();
      window.location.href = '/admin/login';
      return Promise.reject(new Error('未登录或登录已过期'));
    }

    message.error(errMsg);
    return Promise.reject(new Error(errMsg));
  },
  (error: AxiosError<ApiResponse>) => {
    // HTTP 状态码错误
    const status = error.response?.status;
    const serverMsg = error.response?.data?.message;

    let errorMsg = '网络异常，请稍后重试';

    switch (status) {
      case 400:
        errorMsg = serverMsg || '请求参数错误';
        break;
      case 401:
        useAuthStore.getState().clear();
        window.location.href = '/admin/login';
        errorMsg = '未登录或登录已过期';
        break;
      case 403:
        errorMsg = serverMsg || '权限不足或账号已锁定';
        break;
      case 404:
        errorMsg = serverMsg || '请求的资源不存在';
        break;
      case 409:
        errorMsg = serverMsg || '业务冲突，请稍后重试';
        break;
      case 500:
        errorMsg = '系统繁忙，请稍后重试';
        break;
    }

    message.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  },
);

export default request;
