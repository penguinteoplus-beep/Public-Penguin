
export interface GeneratedContent {
  text: string | null;
  imageUrl: string | null;
  originalFile?: File | null; // 保存生成时使用的原始图片，用于重新生成
}

export enum ApiStatus {
  Idle = 'Idle',
  Loading = 'Loading',
  Success = 'Success',
  Error = 'Error',
}

export interface SmartPlusComponent {
  id: number;
  label: string;
  enabled: boolean;
  features: string;
}

export type SmartPlusConfig = SmartPlusComponent[];

export type BPFieldType = 'input' | 'agent';

export type BPAgentModel = 'gemini-2.5-flash' | 'gemini-3-pro-preview';

export interface BPField {
  id: string;
  type: BPFieldType;
  name: string; // Variable name without prefix. e.g. "role" for /role or {role}
  label: string; // Display label
  agentConfig?: {
      instruction: string; // The rule/prompt for the agent
      model: BPAgentModel;
  }
}

export interface CreativeIdea {
  id: number;
  title: string;
  prompt: string; // Template string
  imageUrl: string;
  isSmart?: boolean;
  isSmartPlus?: boolean;
  isBP?: boolean;
  smartPlusConfig?: SmartPlusConfig;
  bpFields?: BPField[]; // Renamed from bpVariables to support generic fields
  order?: number;
  
  // Deprecated but kept for type compatibility during migration if needed
  bpVariables?: any[]; 
}

export interface PromptPreset {
  id: number;
  title: string;
  prompt: string;
}

// 第三方API配置
export interface ThirdPartyApiConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string; // 图片生成模型，默认使用 nano-banana-2
  chatModel?: string; // 分析模型，用于BP智能体和Smart模式，如 gemini-2.5-pro
}

// Nano-banana API 请求参数
export interface NanoBananaRequest {
  model: string;
  prompt: string;
  response_format?: 'url' | 'b64_json';
  aspect_ratio?: '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '1:1' | '4:5' | '5:4' | '21:9';
  image?: string[]; // 参考图数组，url 或 b64_json
  image_size?: '1K' | '2K' | '4K';
  seed?: number; // 随机种子，用于重复生成相同结果或变化生成
}

// Nano-banana API 响应
export interface NanoBananaResponse {
  created?: number;
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message: string;
    type: string;
  };
}

// OpenAI Chat API 请求 (用于文字处理)
export interface OpenAIChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: { url: string };
    }>;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 历史生图记录
export interface GenerationHistory {
  id: number;
  imageUrl: string;
  prompt: string;
  timestamp: number;
  model: string; // 使用的模型
  isThirdParty: boolean; // 是否使用第三方API
  inputImageData?: string; // 原始输入图片的 base64 数据（用于重新生成）
  inputImageName?: string; // 原始输入图片的文件名
  inputImageType?: string; // 原始输入图片的 MIME 类型
  // 创意库相关信息（用于重新生成时恢复）
  creativeTemplateId?: number; // 使用的创意库模板 ID
  creativeTemplateType?: 'smart' | 'smartPlus' | 'bp' | 'none'; // 创意库类型
  bpInputs?: Record<string, string>; // BP 模式的输入值
  smartPlusOverrides?: SmartPlusConfig; // SmartPlus 模式的配置
}
