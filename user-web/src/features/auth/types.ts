export interface LoginDTO {
  phone: string
  password: string
}

export interface RegisterDTO {
  phone: string
  password: string
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
