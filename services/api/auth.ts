// 认证相关 API
import { post, get, setAuthToken, getAuthToken, isLoggedIn } from './index';

export interface User {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  role: 'user' | 'admin';
  coins: number; // Pebbling 鹅卵石余额 🪨
  createdAt: number;
  updatedAt: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

// 用户注册
export const register = async (data: {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
  const result = await post<AuthResponse>('/auth/register', data);
  if (result.success && result.data) {
    setAuthToken(result.data.token);
  }
  return result;
};

// 用户登录
export const login = async (data: {
  username: string;
  password: string;
}): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
  const result = await post<AuthResponse>('/auth/login', data);
  if (result.success && result.data) {
    setAuthToken(result.data.token);
  }
  return result;
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<{ success: boolean; data?: User; error?: string }> => {
  return get<User>('/auth/me');
};

// 更新用户信息
export const updateProfile = async (data: {
  nickname?: string;
  avatar?: string;
}): Promise<{ success: boolean; data?: User; error?: string }> => {
  return post<User>('/auth/me', data);
};

// 修改密码
export const changePassword = async (data: {
  oldPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string; message?: string }> => {
  return post('/auth/change-password', data);
};

// 刷新 Token
export const refreshToken = async (): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
  const result = await post<AuthResponse>('/auth/refresh');
  if (result.success && result.data) {
    setAuthToken(result.data.token);
  }
  return result;
};

// 退出登录
export const logout = () => {
  setAuthToken(null);
};

// 重新导出
export { isLoggedIn, getAuthToken };
