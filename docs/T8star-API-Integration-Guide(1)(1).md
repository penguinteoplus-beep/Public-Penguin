# T8star API 接入指南

> 本文档介绍如何将 T8star（贞贞API）接入项目，替代 Google Gemini API 实现图像生成和文本分析功能。

---

## 1. API 概述

| 功能 | 端点 | 模型 |
|------|------|------|
| 图像生成 | `/v1/images/generations` | `nano-banana-2` |
| 文本/图像分析 | `/v1/chat/completions` | `gemini-2.5-pro` |

**Base URL**: `https://ai.t8star.cn`

**获取 API Key**: [https://ai.t8star.cn/register](https://ai.t8star.cn/register?aff=64350e39653)

---

## 2. 配置结构

```typescript
interface ThirdPartyApiConfig {
  enabled: boolean;      // 是否启用
  baseUrl: string;       // API地址，默认 https://ai.t8star.cn
  apiKey: string;        // API Key，格式 sk-xxx
  model: string;         // 图片生成模型，默认 nano-banana-2
  chatModel?: string;    // 文本分析模型，默认 gemini-2.5-pro
}
```

---

## 3. 图像生成 API

### 3.1 请求格式

```typescript
interface ImageGenerationRequest {
  model: string;                    // 模型名称，如 "nano-banana-2"
  prompt: string;                   // 提示词
  response_format?: 'url' | 'b64_json';  // 返回格式，默认 url
  aspect_ratio?: '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '1:1' | '4:5' | '5:4' | '21:9';
  image?: string[];                 // 参考图数组（图生图），base64 data URL
  image_size?: '1K' | '2K' | '4K';  // 图片尺寸
  seed?: number;                    // 随机种子
}
```

### 3.2 响应格式

```typescript
interface ImageGenerationResponse {
  created?: number;
  data?: Array<{
    url?: string;        // 图片URL
    b64_json?: string;   // base64编码的图片
  }>;
  error?: {
    message: string;
    type: string;
  };
}
```

### 3.3 完整调用示例

```typescript
async function generateImage(
  prompt: string,
  files: File[] = [],
  config: { aspectRatio?: string; imageSize?: string } = {}
): Promise<string> {
  const API_BASE = 'https://ai.t8star.cn';
  const API_KEY = 'sk-your-api-key';
  
  // 构建请求体
  const requestBody: any = {
    model: 'nano-banana-2',
    prompt: prompt,
    response_format: 'url',
    aspect_ratio: config.aspectRatio || '1:1',
    image_size: config.imageSize || '1K',
  };
  
  // 如果有参考图，添加到请求（图生图模式）
  if (files.length > 0) {
    const imagePromises = files.map(async (file) => {
      const base64 = await fileToBase64(file);
      return `data:${file.type};base64,${base64}`;
    });
    requestBody.image = await Promise.all(imagePromises);
  }
  
  // 发送请求
  const response = await fetch(`${API_BASE}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  if (data.data && data.data.length > 0) {
    return data.data[0].url || `data:image/png;base64,${data.data[0].b64_json}`;
  }
  
  throw new Error('API 未返回图片');
}

// 辅助函数：File 转 base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

## 4. 文本/图像分析 API（Chat）

用于图像理解、内容分析、BP智能体等场景。

### 4.1 请求格式

```typescript
interface ChatRequest {
  model: string;                    // 模型名称，如 "gemini-2.5-pro"
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | ContentItem[];
  }>;
  max_tokens?: number;              // 最大输出token，默认 2000
  temperature?: number;             // 温度，默认 0.7
  stream?: boolean;                 // 是否流式输出，默认 false
}

// 带图片的 content 格式
type ContentItem = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };
```

### 4.2 响应格式

```typescript
interface ChatResponse {
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
```

### 4.3 完整调用示例

```typescript
async function chatWithImage(
  systemPrompt: string,
  userMessage: string,
  imageFile?: File
): Promise<string> {
  const API_BASE = 'https://ai.t8star.cn';
  const API_KEY = 'sk-your-api-key';
  
  // 构建用户消息内容
  let userContent: string | ContentItem[];
  
  if (imageFile) {
    // 带图片分析
    const base64 = await fileToBase64(imageFile);
    const imageDataUrl = `data:${imageFile.type};base64,${base64}`;
    userContent = [
      { type: 'text', text: userMessage },
      { type: 'image_url', image_url: { url: imageDataUrl } }
    ];
  } else {
    userContent = userMessage;
  }
  
  const requestBody = {
    model: 'gemini-2.5-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    max_tokens: 2000,
    temperature: 0.7,
    stream: false
  };
  
  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content.trim();
  }
  
  throw new Error('Chat API 未返回有效响应');
}
```

---

## 5. 错误处理与重试

推荐实现重试机制，处理网络波动：

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// 使用示例
const result = await withRetry(() => generateImage(prompt, files));
```

---

## 6. 余额查询（可选）

```typescript
async function checkBalance(baseUrl: string, apiKey: string): Promise<string | null> {
  const endpoints = [
    '/v1/dashboard/billing/credit_grants',
    '/v1/billing/credit_grants',
    '/v1/me'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.total_granted !== undefined) {
          return `总额: $${data.total_granted?.toFixed(2)} | 已用: $${data.total_used?.toFixed(2)}`;
        } else if (data.balance !== undefined) {
          return `余额: $${data.balance?.toFixed(2)}`;
        }
      }
    } catch {
      continue;
    }
  }
  
  return null;
}
```

---

## 7. 快速集成清单

### 7.1 最小化集成

1. **安装依赖**：无需额外依赖，使用原生 `fetch`

2. **配置存储**：
```typescript
// 存储配置到 localStorage
const config = {
  enabled: true,
  baseUrl: 'https://ai.t8star.cn',
  apiKey: 'sk-your-key',
  model: 'nano-banana-2',
  chatModel: 'gemini-2.5-pro'
};
localStorage.setItem('third_party_api_config', JSON.stringify(config));
```

3. **核心函数**：
   - `generateImage()` - 图像生成
   - `chatWithImage()` - 图像/文本分析

### 7.2 支持的功能

| 功能 | 支持 | 说明 |
|------|------|------|
| 文生图 | ✅ | 纯文字描述生成图片 |
| 图生图 | ✅ | 参考图 + 提示词编辑 |
| 多图融合 | ✅ | 多张参考图合成 |
| 图像分析 | ✅ | 理解图片内容 |
| 文本对话 | ✅ | 纯文本交互 |
| 比例控制 | ✅ | 9种宽高比可选 |
| 尺寸控制 | ✅ | 1K/2K/4K |

---

## 8. 与 Gemini 的对比

| 特性 | Gemini API | T8star API |
|------|------------|------------|
| 图像生成模型 | gemini-3-pro-image-preview | nano-banana-2 |
| 文本模型 | gemini-2.5-pro | gemini-2.5-pro |
| 请求格式 | Google SDK | OpenAI 兼容 |
| 图片输入 | Part 对象 | base64 URL |
| 多图支持 | ✅ | ✅ |
| 比例控制 | 有限 | 9种比例 |
| 需要翻墙 | 是 | 否 |

---

## 9. 注意事项

1. **超时设置**：建议设置 120 秒超时，图像生成可能需要较长时间
2. **图片大小**：base64 编码会增加约 33% 的体积，注意大图传输
3. **并发限制**：遵守 API 的速率限制
4. **API Key 安全**：不要在前端代码中硬编码，使用环境变量或配置文件

---

## 10. 参考链接

- API 控制台：https://ai.t8star.cn
- 获取 API Key：https://ai.t8star.cn/register?aff=64350e39653
