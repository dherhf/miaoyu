import request from '@/shared/request'
import type { LoginDTO, RegisterDTO, LoginVO, UserInfoVO, CaptchaVO, SendSmsCodeDTO, ResetPasswordDTO } from './types'

export async function login(data: LoginDTO): Promise<LoginVO> {
  const res = await request.post<LoginVO>('/auth/login', data)
  return res.data
}

export async function register(data: RegisterDTO): Promise<UserInfoVO> {
  const res = await request.post<UserInfoVO>('/auth/register', data)
  return res.data
}

export async function getCaptcha(): Promise<CaptchaVO> {
  const res = await request.get<CaptchaVO>('/auth/captcha')
  return res.data
}

export async function sendSmsCode(data: SendSmsCodeDTO): Promise<void> {
  await request.post('/auth/sms-code', data)
}

export async function resetPassword(data: ResetPasswordDTO): Promise<void> {
  await request.post('/auth/reset-password', data)
}

export async function logout(): Promise<void> {
  await request.post('/auth/logout')
}

export async function getCurrentUser(): Promise<UserInfoVO> {
  const res = await request.get<UserInfoVO>('/auth/me')
  return res.data
}
