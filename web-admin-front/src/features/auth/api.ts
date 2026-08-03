import request from '../../shared/utils/request';
import type { LoginParams, LoginResult, AdminInfo } from './types';

export type { LoginParams, AdminInfo, LoginResult } from './types';

/** 管理员登录 */
export function login(params: LoginParams): Promise<LoginResult> {
  return request.post('/auth/login', params);
}

/** 管理员退出 */
export function logout(): Promise<void> {
  return request.post('/auth/logout');
}

/** 获取当前登录管理员信息 */
export function getCurrentAdmin(): Promise<AdminInfo> {
  return request.get('/auth/me');
}
