// Pebbling 鹅卵石（积分）相关 API
import { get, post } from './index';
import { PriceConfig } from '../../types';

// 获取当前用户积分余额
export const getBalance = async (): Promise<{ success: boolean; data?: { coins: number }; error?: string }> => {
  return get<{ coins: number }>('/coins/balance');
};

// 获取积分变动记录
export const getCoinLogs = async (limit: number = 50): Promise<{ success: boolean; data?: any[]; error?: string }> => {
  return get(`/coins/logs?limit=${limit}`);
};

// 获取价格配置（公开接口）
export const getPrices = async (): Promise<{ success: boolean; data?: PriceConfig; error?: string }> => {
  return get<PriceConfig>('/coins/prices');
};

// 管理员：获取所有系统配置
export const getSystemConfigs = async (): Promise<{ success: boolean; data?: Record<string, number>; error?: string }> => {
  return get<Record<string, number>>('/coins/config');
};

// 管理员：设置系统配置
export const setSystemConfig = async (key: string, value: number): Promise<{ success: boolean; error?: string; message?: string }> => {
  return post('/coins/config', { key, value });
};

// 管理员：给用户充值
export const rechargeUser = async (userId: number, amount: number, description?: string): Promise<{ success: boolean; data?: { newBalance: number }; error?: string; message?: string }> => {
  return post('/coins/recharge', { userId, amount, description });
};
