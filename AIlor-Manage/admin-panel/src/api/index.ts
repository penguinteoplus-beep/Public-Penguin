import axios from 'axios';
import type { ApiResponse, AuthResponse, User, Category, OfficialCreativeIdea, DashboardStats, PaginatedResponse } from '../types';

// 使用相对路径，通过 Vite 代理转发到后端
const API_BASE = '/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== 认证 ====================

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', { username, password });
    if (!data.success || !data.data) throw new Error(data.error || '登录失败');
    return data.data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    if (!data.success || !data.data) throw new Error(data.error || '获取用户信息失败');
    return data.data;
  },
};

// ==================== 仪表盘 ====================

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
    if (!data.success || !data.data) throw new Error(data.error || '获取统计数据失败');
    return data.data;
  },
};

// ==================== 用户管理 ====================

export const userApi = {
  getList: async (page = 1, limit = 20, search?: string): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    const { data } = await api.get<ApiResponse<PaginatedResponse<User>>>(`/admin/users?${params}`);
    if (!data.success || !data.data) throw new Error(data.error || '获取用户列表失败');
    return data.data;
  },

  updateRole: async (id: number, role: 'user' | 'admin'): Promise<void> => {
    const { data } = await api.patch<ApiResponse>(`/admin/users/${id}/role`, { role });
    if (!data.success) throw new Error(data.error || '更新角色失败');
  },
};

// ==================== 分类管理 ====================

export const categoryApi = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get<ApiResponse<Category[]>>('/admin/categories');
    if (!data.success || !data.data) throw new Error(data.error || '获取分类列表失败');
    return data.data;
  },

  getById: async (id: number): Promise<Category> => {
    const { data } = await api.get<ApiResponse<Category>>(`/admin/categories/${id}`);
    if (!data.success || !data.data) throw new Error(data.error || '获取分类失败');
    return data.data;
  },

  create: async (input: Partial<Category>): Promise<Category> => {
    const { data } = await api.post<ApiResponse<Category>>('/admin/categories', input);
    if (!data.success || !data.data) throw new Error(data.error || '创建分类失败');
    return data.data;
  },

  update: async (id: number, input: Partial<Category>): Promise<Category> => {
    const { data } = await api.put<ApiResponse<Category>>(`/admin/categories/${id}`, input);
    if (!data.success || !data.data) throw new Error(data.error || '更新分类失败');
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    const { data } = await api.delete<ApiResponse>(`/admin/categories/${id}`);
    if (!data.success) throw new Error(data.error || '删除分类失败');
  },
};

// ==================== 官方创意库 ====================

export const officialIdeaApi = {
  getList: async (
    page = 1,
    limit = 20,
    options: { categoryId?: number; status?: string; search?: string } = {}
  ): Promise<PaginatedResponse<OfficialCreativeIdea>> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (options.categoryId) params.append('categoryId', String(options.categoryId));
    if (options.status) params.append('status', options.status);
    if (options.search) params.append('search', options.search);
    const { data } = await api.get<ApiResponse<PaginatedResponse<OfficialCreativeIdea>>>(`/admin/official-ideas?${params}`);
    if (!data.success || !data.data) throw new Error(data.error || '获取创意列表失败');
    return data.data;
  },

  getById: async (id: number): Promise<OfficialCreativeIdea> => {
    const { data } = await api.get<ApiResponse<OfficialCreativeIdea>>(`/admin/official-ideas/${id}`);
    if (!data.success || !data.data) throw new Error(data.error || '获取创意失败');
    return data.data;
  },

  create: async (input: Partial<OfficialCreativeIdea>): Promise<OfficialCreativeIdea> => {
    const { data } = await api.post<ApiResponse<OfficialCreativeIdea>>('/admin/official-ideas', input);
    if (!data.success || !data.data) throw new Error(data.error || '创建创意失败');
    return data.data;
  },

  update: async (id: number, input: Partial<OfficialCreativeIdea>): Promise<OfficialCreativeIdea> => {
    const { data } = await api.put<ApiResponse<OfficialCreativeIdea>>(`/admin/official-ideas/${id}`, input);
    if (!data.success || !data.data) throw new Error(data.error || '更新创意失败');
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    const { data } = await api.delete<ApiResponse>(`/admin/official-ideas/${id}`);
    if (!data.success) throw new Error(data.error || '删除创意失败');
  },

  reorder: async (orders: { id: number; order: number }[]): Promise<void> => {
    const { data } = await api.post<ApiResponse>('/admin/official-ideas/reorder', { orders });
    if (!data.success) throw new Error(data.error || '更新排序失败');
  },

  copy: async (id: number): Promise<OfficialCreativeIdea> => {
    const { data } = await api.post<ApiResponse<OfficialCreativeIdea>>(`/admin/official-ideas/${id}/copy`);
    if (!data.success || !data.data) throw new Error(data.error || '复制创意失败');
    return data.data;
  },
};

// 上传图片
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ApiResponse<{ url: string }>>('/upload/single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.success || !data.data) throw new Error(data.error || '上传失败');
  return data.data.url;
};

export default api;
