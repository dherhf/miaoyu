import axios from 'axios'
import { getGlobalMessage } from './globalMessage'
import { useAuthStore } from '@/features/auth/store'
import { router } from '@/router'

interface Result<T> {
  code: number
  message: string
  data: T | null
}

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const result = response.data as Result<unknown>
    if (result.code === 0) {
      response.data = result.data
      return response
    }
    getGlobalMessage()?.error(result.message || '请求失败')
    return Promise.reject({ __handled: true, ...result })
  },
  (error) => {
    if (error.__handled) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      useAuthStore.setState({ token: null, userInfo: null })
      router.navigate('/login')
      return Promise.reject(error)
    }

    if (error.response?.status === 403) {
      getGlobalMessage()?.error('无权限执行此操作')
      return Promise.reject(error)
    }

    const serverMsg = error.response?.data?.message
    if (serverMsg) {
      getGlobalMessage()?.error(serverMsg)
    } else if (error.code === 'ECONNABORTED') {
      getGlobalMessage()?.error('请求超时，请稍后重试')
    } else {
      getGlobalMessage()?.error('网络异常，请稍后重试')
    }
    return Promise.reject(error)
  },
)

export default request
