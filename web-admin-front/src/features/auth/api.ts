import request from '../../shared/utils/request';
import type { LoginParams, LoginResult } from './types';

export type { LoginParams, AdminInfo, LoginResult } from './types';

/** 管理员登录 */
export function login(params: LoginParams): Promise<LoginResult> {
  return request.post('/auth/login', params);
}

/** 管理员退出 */
export function logout(): Promise<null> {
  return request.post('/auth/logout');
}
