import request from '@/shared/request'
import type { LoginDTO, RegisterDTO, LoginVO, UserInfoVO } from './types'

export async function login(data: LoginDTO): Promise<LoginVO> {
  const res = await request.post<LoginVO>('/auth/login', data)
  return res.data
}

export async function register(data: RegisterDTO): Promise<UserInfoVO> {
  const res = await request.post<UserInfoVO>('/auth/register', data)
  return res.data
}

export async function logout(): Promise<void> {
  await request.post('/auth/logout')
}

export async function getCurrentUser(): Promise<UserInfoVO> {
  const res = await request.get<UserInfoVO>('/auth/me')
  return res.data
}
