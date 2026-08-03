import request from '../utils/request';

export interface LoginParams {
  phone: string;
  password: string;
}

export interface AdminInfo {
  id: number;
  name: string;
  status: number;
}

export interface LoginResult {
  token: string;
  adminInfo: AdminInfo;
}

/** 管理员登录 */
export function login(params: LoginParams): Promise<LoginResult> {
  return request.post('/auth/login', params);
}

/** 管理员退出 */
export function logout(): Promise<null> {
  return request.post('/auth/logout');
}
