import axios, { AxiosError } from 'axios';
import {
  ThirdPartyApiConfig,
  NanoBananaRequest,
  NanoBananaResponse,
  OpenAIChatRequest,
  OpenAIChatResponse,
} from '../types';

// 默认配置 - 如果环境变量配置了 API，则自动启用
const defaultConfig: ThirdPartyApiConfig = {
  enabled: !!(process.env.THIRD_PARTY_BASE_URL && process.env.THIRD_PARTY_API_KEY),
  baseUrl: process.env.THIRD_PARTY_BASE_URL || '',
  apiKey: process.env.THIRD_PARTY_API_KEY || '',
  model: 'nano-banana-2',
  chatModel: 'gemini-2.5-pro',
};

let currentConfig: ThirdPartyApiConfig = { ...defaultConfig };

// 设置配置
export function setApiConfig(config: Partial<ThirdPartyApiConfig>): ThirdPartyApiConfig {
  currentConfig = { ...currentConfig, ...config };
  return currentConfig;
}

// 获取配置
export function getApiConfig(): ThirdPartyApiConfig {
  return { ...currentConfig };
}

// Nano-Banana 图像生成 API
export async function generateImage(request: NanoBananaRequest): Promise<NanoBananaResponse> {
  const config = getApiConfig();
  
  if (!config.enabled || !config.baseUrl || !config.apiKey) {
    throw new Error('后端贞贞 API 未配置。请在后端 .env 文件中设置 THIRD_PARTY_BASE_URL 和 THIRD_PARTY_API_KEY');
  }

  try {
    const response = await axios.post<NanoBananaResponse>(
      `${config.baseUrl}/v1/images/generations`,
      {
        model: request.model || config.model,
        prompt: request.prompt,
        response_format: request.response_format || 'url',
        aspect_ratio: request.aspect_ratio || '1:1',
        image: request.image,
        image_size: request.image_size || '1K',
        seed: request.seed,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 分钟超时
      }
    );

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorData = error.response?.data;
      throw new Error(errorData?.error?.message || error.message || '图像生成请求失败');
    }
    throw error;
  }
}

// OpenAI 兼容的聊天 API（用于文本分析）
export async function chatCompletion(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
  const config = getApiConfig();
  
  if (!config.enabled || !config.baseUrl || !config.apiKey) {
    throw new Error('后端贞贞 API 未配置。请在后端 .env 文件中设置 THIRD_PARTY_BASE_URL 和 THIRD_PARTY_API_KEY');
  }

  try {
    const response = await axios.post<OpenAIChatResponse>(
      `${config.baseUrl}/v1/chat/completions`,
      {
        model: request.model || config.chatModel,
        messages: request.messages,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature || 0.7,
        stream: request.stream || false,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 1 分钟超时
      }
    );

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorData = error.response?.data;
      throw new Error(errorData?.error?.message || error.message || '聊天请求失败');
    }
    throw error;
  }
}

// 通用 API 代理
export async function proxyRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  data?: any,
  customConfig?: Partial<ThirdPartyApiConfig>
): Promise<any> {
  const config = customConfig ? { ...getApiConfig(), ...customConfig } : getApiConfig();
  
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('API 未配置');
  }

  try {
    const response = await axios({
      method,
      url: `${config.baseUrl}${endpoint}`,
      data,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorData = error.response?.data;
      throw new Error(errorData?.error?.message || error.message || 'API 请求失败');
    }
    throw error;
  }
}
