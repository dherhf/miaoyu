import axios from 'axios'
import { getGlobalMessage } from './globalMessage'
import { useAuthStore } from '@/features/auth/store'
import { router } from '@/router'

/**
 * 后端统一响应格式。
 * code=0 表示成功，其他为业务错误码。
 */
interface Result<T> {
  /** 业务状态码，0 表示成功 */
  code: number
  /** 提示消息 */
  message: string
  /** 响应数据 */
  data: T | null
}

// 扩展 axios 配置：_silent 为 true 时静默错误（不弹消息提示）
declare module 'axios' {
  interface AxiosRequestConfig {
    _silent?: boolean
  }
}

// 创建 axios 实例，统一配置基础路径和超时时间
const request = axios.create({
  baseURL: '/api/v1',  // 所有请求以 /api/v1 为前缀，由网关转发到后端服务
  timeout: 10000,       // 请求超时时间 10 秒
})

// 请求拦截器：自动携带 JWT 令牌
request.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理业务状态码和 HTTP 错误
request.interceptors.response.use(
  (response) => {
    const result = response.data as Result<unknown>
    // 业务成功：直接返回 data 字段
    if (result.code === 0) {
      response.data = result.data
      return response
    }
    // 业务失败：弹出错误提示并 reject
    getGlobalMessage()?.error(result.message || '请求失败')
    return Promise.reject({ __handled: true, ...result })
  },
  (error) => {
    // 已在响应拦截器中处理过的业务错误，直接传递
    if (error.__handled) {
      return Promise.reject(error)
    }

    // 静默模式：不弹提示，直接 reject
    if (error.config?._silent) {
      return Promise.reject(error)
    }

    // 401 未授权：清除登录态并跳转登录页
    if (error.response?.status === 401) {
      useAuthStore.setState({ token: null, userInfo: null })
      router.navigate('/login')
      return Promise.reject(error)
    }

    // 403 无权限：提示无权限
    if (error.response?.status === 403) {
      getGlobalMessage()?.error('无权限执行此操作')
      return Promise.reject(error)
    }

    // 其他错误：优先展示后端返回的消息
    const serverMsg = error.response?.data?.message
    if (serverMsg) {
      getGlobalMessage()?.error(serverMsg)
    } else if (error.code === 'ECONNABORTED') {
      // 请求超时
      getGlobalMessage()?.error('请求超时，请稍后重试')
    } else {
      // 网络异常
      getGlobalMessage()?.error('网络异常，请稍后重试')
    }
    return Promise.reject(error)
  },
)

export default request
