/** 登录请求参数 */
export interface LoginDTO {
  /** 手机号 */
  phone: string
  /** 密码 */
  password: string
}

/** 注册请求参数 */
export interface RegisterDTO {
  /** 手机号 */
  phone: string
  /** 密码 */
  password: string
  /** 短信验证码 */
  smsCode: string
}

/** 发送短信验证码请求参数 */
export interface SendSmsCodeDTO {
  /** 手机号 */
  phone: string
  /** 场景类型：注册 或 重置密码 */
  scene: 'register' | 'reset-password'
  /** 图形验证码ID */
  captchaId: string
  /** 图形验证码文本 */
  captchaCode: string
}

/** 重置密码请求参数 */
export interface ResetPasswordDTO {
  /** 手机号 */
  phone: string
  /** 新密码 */
  newPassword: string
  /** 短信验证码 */
  smsCode: string
}

/** 图形验证码响应 */
export interface CaptchaVO {
  /** 验证码ID（提交短信验证码时需携带） */
  captchaId: string
  /** Base64 编码的验证码图片 */
  image: string
}

/** 用户信息 */
export interface UserInfoVO {
  /** 用户ID */
  id: string
  /** 手机号 */
  phone: string
  /** 昵称 */
  nickname: string
  /** 账号状态：1=正常，0=禁用 */
  status: number
  /** 创建时间 */
  createdAt?: string
}

/** 登录响应 */
export interface LoginVO {
  /** JWT 令牌 */
  token: string
  /** 用户信息 */
  userInfo: UserInfoVO
}
