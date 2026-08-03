import request, { type PageResult } from '../utils/request';
import type { LoginParams, LoginResult } from '../types/auth';

export type { LoginParams, AdminInfo, LoginResult } from '../types/auth';

/** 管理员登录 */
export function login(params: LoginParams): Promise<LoginResult> {
  return request.post('/auth/login', params);
}

/** 管理员退出 */
export function logout(): Promise<null> {
  return request.post('/auth/logout');
}
