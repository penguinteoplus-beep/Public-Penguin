import { query, queryOne, execute } from './database';

interface SystemConfigRow {
  id: number;
  configKey: string;
  configValue: string;
  description: string | null;
  updatedAt: number;
}

// 获取系统配置
export function getSystemConfig(key: string): string | null {
  const row = queryOne<SystemConfigRow>(
    'SELECT * FROM system_config WHERE configKey = ?',
    [key]
  );
  return row ? row.configValue : null;
}

// 获取所有系统配置
export function getAllSystemConfig(): Record<string, string> {
  const rows = query<SystemConfigRow>('SELECT * FROM system_config');
  const result: Record<string, string> = {};
  rows.forEach(row => {
    result[row.configKey] = row.configValue;
  });
  return result;
}

// 设置系统配置
export function setSystemConfig(key: string, value: string, description?: string): void {
  const existing = queryOne<SystemConfigRow>(
    'SELECT * FROM system_config WHERE configKey = ?',
    [key]
  );
  
  if (existing) {
    execute(
      'UPDATE system_config SET configValue = ?, updatedAt = strftime(\'%s\', \'now\') WHERE configKey = ?',
      [value, key]
    );
  } else {
    execute(
      'INSERT INTO system_config (configKey, configValue, description) VALUES (?, ?, ?)',
      [key, value, description || null]
    );
  }
}

// 删除系统配置
export function deleteSystemConfig(key: string): boolean {
  execute('DELETE FROM system_config WHERE configKey = ?', [key]);
  return true;
}

// AI 配置相关
export interface AIConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  chatModel: string;
}

export function getAIConfig(): AIConfig {
  return {
    enabled: getSystemConfig('ai_enabled') === 'true',
    baseUrl: getSystemConfig('ai_base_url') || '',
    apiKey: getSystemConfig('ai_api_key') || '',
    model: getSystemConfig('ai_model') || 'nano-banana-2',
    chatModel: getSystemConfig('ai_chat_model') || 'gemini-2.5-pro',
  };
}

export function setAIConfig(config: Partial<AIConfig>): void {
  if (config.enabled !== undefined) {
    setSystemConfig('ai_enabled', String(config.enabled), 'AI功能是否启用');
  }
  if (config.baseUrl !== undefined) {
    setSystemConfig('ai_base_url', config.baseUrl, 'AI API基础地址');
  }
  if (config.apiKey !== undefined) {
    setSystemConfig('ai_api_key', config.apiKey, 'AI API密钥');
  }
  if (config.model !== undefined) {
    setSystemConfig('ai_model', config.model, '图像生成模型');
  }
  if (config.chatModel !== undefined) {
    setSystemConfig('ai_chat_model', config.chatModel, '对话/分析模型');
  }
}

// 价格配置相关
export interface PriceConfig {
  generateImage: number;
  analyzeImage: number;
  chat: number;
}

export function getPriceConfig(): PriceConfig {
  return {
    generateImage: parseInt(getSystemConfig('price_generate_image') || '10', 10),
    analyzeImage: parseInt(getSystemConfig('price_analyze_image') || '5', 10),
    chat: parseInt(getSystemConfig('price_chat') || '1', 10),
  };
}

export function setPriceConfig(config: Partial<PriceConfig>): void {
  if (config.generateImage !== undefined) {
    setSystemConfig('price_generate_image', String(config.generateImage), '生成图像消耗');
  }
  if (config.analyzeImage !== undefined) {
    setSystemConfig('price_analyze_image', String(config.analyzeImage), '分析图片消耗');
  }
  if (config.chat !== undefined) {
    setSystemConfig('price_chat', String(config.chat), '对话消耗');
  }
}
