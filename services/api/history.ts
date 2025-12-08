// 历史记录相关 API
import { get, post, del } from './index';
import { GenerationHistory } from '../../types';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 获取历史记录列表（分页）
export const getHistoryList = async (page: number = 1, limit: number = 20): Promise<{ 
  success: boolean; 
  data?: PaginatedResponse<GenerationHistory>; 
  error?: string 
}> => {
  return get<PaginatedResponse<GenerationHistory>>(`/history?page=${page}&limit=${limit}`);
};

// 获取所有历史记录
export const getAllHistory = async (): Promise<{ success: boolean; data?: GenerationHistory[]; error?: string }> => {
  return get<GenerationHistory[]>('/history?all=true');
};

// 获取单条历史记录
export const getHistoryById = async (id: number): Promise<{ success: boolean; data?: GenerationHistory; error?: string }> => {
  return get<GenerationHistory>(`/history/${id}`);
};

// 创建历史记录
export const createHistory = async (history: Omit<GenerationHistory, 'id'>): Promise<{ success: boolean; data?: GenerationHistory; error?: string }> => {
  return post<GenerationHistory>('/history', history);
};

// 删除历史记录
export const deleteHistory = async (id: number): Promise<{ success: boolean; error?: string; message?: string }> => {
  return del(`/history/${id}`);
};

// 清空所有历史记录
export const clearAllHistory = async (): Promise<{ success: boolean; error?: string; message?: string }> => {
  return del('/history');
};
