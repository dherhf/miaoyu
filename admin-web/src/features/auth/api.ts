import request from '../../shared/utils/request';
import type { LoginParams, LoginResult, AdminInfo } from './types';

export type { LoginParams, AdminInfo, LoginResult } from './types';

/**
 * 认证相关 API
 * 对应后端接口：/api/v1/admin/auth/*
 */
export const authApi = {
  /**
   * 管理员登录
   * POST /api/v1/admin/auth/login
   * @param data - 登录参数（手机号 + 密码）
   * @returns token 和管理员信息
   */
  login: (data: LoginParams): Promise<LoginResult> =>
    request.post('/auth/login', data),

  /**
   * 管理员退出登录
   * POST /api/v1/admin/auth/logout
   * 后端使当前 token 失效
   */
  logout: (): Promise<void> => request.post('/auth/logout'),

  /**
   * 获取当前登录管理员信息
   * GET /api/v1/admin/auth/me
   * 用于页面刷新后恢复登录态
   * @returns 管理员信息（id、名称、状态）
   */
  getCurrentAdmin: (): Promise<AdminInfo> => request.get('/auth/me'),
};
