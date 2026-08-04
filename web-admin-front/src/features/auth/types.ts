// ===================== 认证相关类型 =====================

/** 登录请求参数 */
export interface LoginParams {
  phone: string;
  password: string;
}

/** 管理员信息 */
export interface AdminInfo {
  id: string;
  name: string;
  status: number;
}

/** 登录响应 */
export interface LoginResult {
  token: string;
  adminInfo: AdminInfo;
}


