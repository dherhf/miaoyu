// ===================== 认证相关类型 =====================

/** 登录请求参数 */
export interface LoginParams {
  phone: string;
  password: string;
}

/** 管理员信息 */
export interface AdminInfo {
  id: number;
  name: string;
  status: number;
}

/** 登录响应 */
export interface LoginResult {
  token: string;
  adminInfo: AdminInfo;
}

/** 用户角色 */
export type UserRole = 'super_admin' | 'admin';

/** 当前登录用户（Store 层使用） */
export interface AuthUser {
  id: number;
  username: string;
  realName: string;
  avatar?: string;
  role: UserRole;
}
