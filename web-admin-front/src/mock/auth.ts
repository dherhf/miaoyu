import type { AuthUser } from '../types/auth';

export const mockAdmin: AuthUser = {
  id: 1,
  username: 'admin',
  realName: '系统管理员',
  role: 'super_admin' as AuthUser['role'],
};
