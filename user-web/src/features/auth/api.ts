import request from '@/shared/request'
import type { LoginDTO, RegisterDTO, LoginVO, UserInfoVO, CaptchaVO, SendSmsCodeDTO, ResetPasswordDTO } from './types'

/**
 * 用户登录。
 * 后端接口：POST /api/v1/auth/login
 * @param data 登录请求参数（手机号 + 密码）
 * @returns 登录结果（JWT 令牌 + 用户信息）
 */
export async function login(data: LoginDTO): Promise<LoginVO> {
  const res = await request.post<LoginVO>('/auth/login', data)
  return res.data
}

/**
 * 用户注册。
 * 后端接口：POST /api/v1/auth/register
 * @param data 注册请求参数（手机号 + 密码 + 短信验证码）
 * @returns 注册成功的用户信息
 */
export async function register(data: RegisterDTO): Promise<UserInfoVO> {
  const res = await request.post<UserInfoVO>('/auth/register', data)
  return res.data
}

/**
 * 获取图形验证码。
 * 后端接口：GET /api/v1/auth/captcha
 * @returns 验证码信息（验证码ID + Base64 图片）
 */
export async function getCaptcha(): Promise<CaptchaVO> {
  const res = await request.get<CaptchaVO>('/auth/captcha')
  return res.data
}

/**
 * 发送短信验证码。
 * 后端接口：POST /api/v1/auth/sms-code
 * @param data 发送短信验证码参数（手机号 + 场景 + 图形验证码信息）
 */
export async function sendSmsCode(data: SendSmsCodeDTO): Promise<void> {
  await request.post('/auth/sms-code', data)
}

/**
 * 重置密码。
 * 后端接口：POST /api/v1/auth/reset-password
 * @param data 重置密码参数（手机号 + 新密码 + 短信验证码）
 */
export async function resetPassword(data: ResetPasswordDTO): Promise<void> {
  await request.post('/auth/reset-password', data)
}

/**
 * 退出登录。
 * 后端接口：POST /api/v1/auth/logout
 */
export async function logout(): Promise<void> {
  await request.post('/auth/logout')
}

/**
 * 获取当前登录用户信息。
 * 后端接口：GET /api/v1/auth/me
 * @returns 当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfoVO> {
  const res = await request.get<UserInfoVO>('/auth/me')
  return res.data
}
