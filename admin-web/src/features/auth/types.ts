// ===================== 认证相关类型 =====================

/** 登录请求参数 */
export interface LoginParams {
  /** 手机号 */
  phone: string;
  /** 密码 */
  password: string;
}

/** 管理员信息 */
export interface AdminInfo {
  /** 管理员 ID */
  id: string;
  /** 管理员名称 */
  name: string;
  /** 账号状态（1=正常 0=锁定） */
  status: number;
}

/** 登录响应 */
export interface LoginResult {
  /** JWT 令牌 */
  token: string;
  /** 管理员信息 */
  adminInfo: AdminInfo;
}
