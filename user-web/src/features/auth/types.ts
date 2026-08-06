export interface LoginDTO {
  phone: string
  password: string
}

export interface RegisterDTO {
  phone: string
  password: string
  smsCode: string
}

export interface SendSmsCodeDTO {
  phone: string
  scene: 'register' | 'reset-password'
  captchaId: string
  captchaCode: string
}

export interface ResetPasswordDTO {
  phone: string
  newPassword: string
  smsCode: string
}

export interface CaptchaVO {
  captchaId: string
  image: string
}

export interface UserInfoVO {
  id: string
  phone: string
  nickname: string
  status: number
  createdAt?: string
}

export interface LoginVO {
  token: string
  userInfo: UserInfoVO
}
