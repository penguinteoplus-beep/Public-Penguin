// API 基础配置和请求封装
// 使用相对路径，自动适配当前域名
const API_BASE = '/api';

// Token 存储
let authToken: string | null = localStorage.getItem('auth_token');

// 设置 Token
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

// 获取 Token
export const getAuthToken = () => authToken;

// 检查是否已登录
export const isLoggedIn = () => !!authToken;

// 通用请求方法
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    // 如果 token 过期，清除登录状态
    if (response.status === 401 && data.error?.includes('过期')) {
      setAuthToken(null);
    }
    
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '请求失败',
    };
  }
}

// GET 请求
export const get = <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' });

// POST 请求
export const post = <T>(endpoint: string, body?: any) =>
  request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });

// PUT 请求
export const put = <T>(endpoint: string, body?: any) =>
  request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });

// DELETE 请求
export const del = <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' });

// 文件上传
export const uploadFile = async (file: File): Promise<{ success: boolean; data?: any; error?: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_BASE}/upload/single`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    };
  }
};

export { API_BASE };
