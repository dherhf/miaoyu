import request from '../../shared/utils/request';
import type { LoginParams, LoginResult, AdminInfo } from './types';

export type { LoginParams, AdminInfo, LoginResult } from './types';

export const authApi = {
  /** 管理员登录 */
  login: (data: LoginParams): Promise<LoginResult> =>
    request.post('/auth/login', data),

  /** 管理员退出 */
  logout: (): Promise<void> => request.post('/auth/logout'),

  /** 获取当前登录管理员信息 */
  getCurrentAdmin: (): Promise<AdminInfo> => request.get('/auth/me'),
};
