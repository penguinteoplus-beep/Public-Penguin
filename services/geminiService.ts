
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse, Part } from "@google/genai";
import { GeneratedContent, CreativeIdea, SmartPlusConfig, BPField, BPAgentModel, ThirdPartyApiConfig, NanoBananaRequest, NanoBananaResponse, OpenAIChatRequest, OpenAIChatResponse } from '../types';
import { post, isLoggedIn } from './api';

let ai: GoogleGenAI | null = null;

// 第三方API配置存储
let thirdPartyConfig: ThirdPartyApiConfig | null = null;

export const setThirdPartyConfig = (config: ThirdPartyApiConfig | null) => {
  thirdPartyConfig = config;
};

export const getThirdPartyConfig = (): ThirdPartyApiConfig | null => {
  return thirdPartyConfig;
};

export const initializeAiClient = (apiKey: string) => {
  if (!apiKey) {
    ai = null;
    console.warn("API Key removed. AI Client de-initialized.");
    return;
  }
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    ai = null;
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    console.error("Failed to initialize AI Client:", errorMessage);
    throw new Error(`Failed to initialize AI Client. Please check your API key. Error: ${errorMessage}`);
  }
};

const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> => {
  let lastError: unknown = new Error("Retry attempts failed.");
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const isRetriable = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable');

      if (isRetriable && attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed with retriable error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw lastError;
      }
    }
  }
  throw lastError;
};

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export interface ImageEditConfig {
  aspectRatio: string;
  imageSize: string;
  seed?: number; // 随机种子，用于重新生成
}

// 将文件转换为 base64
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
};

// 将 aspectRatio 转换为 Nano-banana 支持的格式
const convertAspectRatio = (ratio: string): NanoBananaRequest['aspect_ratio'] | undefined => {
  const validRatios = ['4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '1:1', '4:5', '5:4', '21:9'];
  if (ratio === 'Auto' || !validRatios.includes(ratio)) {
    return '1:1'; // 默认使用 1:1
  }
  return ratio as NanoBananaRequest['aspect_ratio'];
};

// 第三方API图片生成 - 支持文生图和图生图
// 如果已登录，通过后端代理调用（会自动扣费）
// 如果未登录，直接调用第三方API（不扣费）
export const editImageWithThirdPartyApi = async (
  file: File | null, 
  prompt: string, 
  config: ImageEditConfig,
  creativeIdeaCost?: number // 创意库定义的扣费金额
): Promise<GeneratedContent> => {
  if (!thirdPartyConfig || !thirdPartyConfig.enabled) {
    throw new Error("第三方API未启用");
  }
  
  // 云模式（已登录）：直接走后端代理，不需要前端 API Key
  // 本地模式（未登录）：需要前端配置 API Key
  const isCloudMode = isLoggedIn();
  
  if (!isCloudMode) {
    // 本地模式才需要检查前端 API 配置
    if (!thirdPartyConfig.apiKey) {
      throw new Error("请先配置第三方API Key");
    }
    if (!thirdPartyConfig.baseUrl) {
      throw new Error("请先配置第三方API Base URL");
    }
  }
  
  // 构建请求体
  const requestBody: NanoBananaRequest & { creativeIdeaCost?: number } = {
    model: thirdPartyConfig.model || 'nano-banana-2',
    prompt: prompt,
    response_format: 'url',
    aspect_ratio: convertAspectRatio(config.aspectRatio),
    image_size: config.imageSize as '1K' | '2K' | '4K',
    seed: config.seed,
    creativeIdeaCost: creativeIdeaCost // 传递创意库扣费金额
  };
  
  // 如果有上传图片，添加参考图（图生图模式）
  if (file) {
    const imageBase64 = await fileToBase64(file);
    const imageDataUrl = `data:${file.type};base64,${imageBase64}`;
    requestBody.image = [imageDataUrl];
  }

  // 云模式：通过后端代理调用（会扣费）
  if (isCloudMode) {
    const apiResult = await post<NanoBananaResponse & { coinsDeducted?: number; coinsRemaining?: number }>(
      '/ai/generate-image',
      requestBody
    );
    
    if (!apiResult.success) {
      // 后端返回的错误信息（包括余额不足的趣味提示）
      throw new Error(apiResult.error || '图像生成失败');
    }
    
    const response = apiResult.data;
    const result: GeneratedContent = { 
      text: null, 
      imageUrl: null,
      coinsDeducted: response?.coinsDeducted,
      coinsRemaining: response?.coinsRemaining,
    };
    
    if (response?.data && response.data.length > 0) {
      const imageData = response.data[0];
      if (imageData.url) {
        result.imageUrl = imageData.url;
      } else if (imageData.b64_json) {
        result.imageUrl = `data:image/png;base64,${imageData.b64_json}`;
      }
    }
    
    if (!result.imageUrl) {
      throw new Error("API 未返回图片");
    }
    
    return result;
  }
  
  // 未登录：直接调用第三方API（不扣费）
  const url = `${thirdPartyConfig.baseUrl.replace(/\/$/, '')}/v1/images/generations`;
  
  const response = await withRetry(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${thirdPartyConfig!.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API 请求失败 (${res.status}): ${errorText}`);
    }
    
    return res.json() as Promise<NanoBananaResponse>;
  });
  
  // 解析响应
  const result: GeneratedContent = { text: null, imageUrl: null };
  
  if (response.error) {
    throw new Error(`API 错误: ${response.error.message}`);
  }
  
  if (response.data && response.data.length > 0) {
    const imageData = response.data[0];
    if (imageData.url) {
      result.imageUrl = imageData.url;
    } else if (imageData.b64_json) {
      result.imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    }
  }
  
  if (!result.imageUrl) {
    throw new Error("API 未返回图片");
  }
  
  return result;
};

// 第三方API文字处理/图片分析 (Chat Completions)
// 如果已登录，通过后端代理调用（会自动扣费）
// 如果未登录，直接调用第三方API（不扣费）
export const chatWithThirdPartyApi = async (
  systemPrompt: string,
  userMessage: string,
  imageFile?: File
): Promise<string> => {
  if (!thirdPartyConfig || !thirdPartyConfig.enabled) {
    throw new Error("第三方API未启用");
  }
  
  // 云模式（已登录）：直接走后端代理，不需要前端 API Key
  // 本地模式（未登录）：需要前端配置 API Key
  const isCloudMode = isLoggedIn();
  
  if (!isCloudMode) {
    // 本地模式才需要检查前端 API 配置
    if (!thirdPartyConfig.apiKey) {
      throw new Error("请先配置第三方API Key");
    }
    if (!thirdPartyConfig.baseUrl) {
      throw new Error("请先配置第三方API Base URL");
    }
  }
  
  // 构建用户消息内容 - 根据API文档格式
  type ContentItem = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
  let userContent: string | ContentItem[];
  
  if (imageFile) {
    // 分析图片时，content需要是数组格式
    const imageBase64 = await fileToBase64(imageFile);
    const imageDataUrl = `data:${imageFile.type};base64,${imageBase64}`;
    userContent = [
      { type: 'text', text: userMessage },
      { type: 'image_url', image_url: { url: imageDataUrl } }
    ];
  } else {
    userContent = userMessage;
  }
  
  // 使用配置的chatModel，默认使用 gemini-2.5-pro
  const chatModel = thirdPartyConfig.chatModel || 'gemini-2.5-pro';
  
  const requestBody: OpenAIChatRequest = {
    model: chatModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    max_tokens: 2000,
    temperature: 0.7,
    stream: false
  };

  // 云模式：通过后端代理调用（会扣费）
  if (isCloudMode) {
    const apiResult = await post<OpenAIChatResponse & { coinsDeducted?: number; coinsRemaining?: number }>(
      '/ai/chat',
      requestBody
    );
    
    if (!apiResult.success) {
      // 后端返回的错误信息（包括余额不足的趣味提示）
      throw new Error(apiResult.error || '聊天请求失败');
    }
    
    const response = apiResult.data;
    if (response?.choices && response.choices.length > 0) {
      return response.choices[0].message.content.trim();
    }
    
    throw new Error("Chat API 未返回有效响应");
  }
  
  // 未登录：直接调用第三方API（不扣费）
  const url = `${thirdPartyConfig.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  
  const response = await withRetry(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${thirdPartyConfig!.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Chat API 请求失败 (${res.status}): ${errorText}`);
    }
    
    return res.json() as Promise<OpenAIChatResponse>;
  });
  
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content.trim();
  }
  
  throw new Error("Chat API 未返回有效响应");
};

export const editImageWithGemini = async (file: File | null, prompt: string, config: ImageEditConfig, creativeIdeaCost?: number): Promise<GeneratedContent> => {
  // 如果启用了第三方API，使用第三方API
  if (thirdPartyConfig && thirdPartyConfig.enabled) {
    return editImageWithThirdPartyApi(file, prompt, config, creativeIdeaCost);
  }
  
  if (!ai) {
    throw new Error("请先设置 Gemini API Key");
  }
  
  const model = 'gemini-3-pro-image-preview';

  if (!prompt) throw new Error("请输入提示词");

  // 构建内容 - 支持文生图和图生图
  let contents;
  
  if (file) {
    // 图生图模式
    const imagePart = await fileToGenerativePart(file);
    const instruction = '请根据以下提示词编辑图片，只输出结果图片，不要输出任何文字描述。';
    const textPart: Part = { text: `${instruction}\n\n${prompt}` };
    contents = {
      parts: [imagePart, textPart],
    };
  } else {
    // 文生图模式
    const instruction = '请根据以下提示词生成图片，只输出结果图片，不要输出任何文字描述。';
    const textPart: Part = { text: `${instruction}\n\n${prompt}` };
    contents = {
      parts: [textPart],
    };
  }

  // Configure image settings
  const imageConfig: any = {
      imageSize: config.imageSize,
  };
  
  // Only add aspectRatio if it's not 'Auto'
  if (config.aspectRatio !== 'Auto') {
      imageConfig.aspectRatio = config.aspectRatio;
  }

  const response: GenerateContentResponse = await withRetry(() => 
    ai!.models.generateContent({
      model: model,
      contents: contents,
      config: {
        imageConfig: imageConfig
      },
    })
  );

  const result: GeneratedContent = { text: null, imageUrl: null };

  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.text) {
              result.text = (result.text || "") + part.text;
          } else if (part.inlineData) {
              const base64ImageBytes: string = part.inlineData.data;
              const mimeType = part.inlineData.mimeType;
              result.imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
              break; 
          }
      }
  }

  if (!result.imageUrl) {
    const responseText = result.text || response.candidates?.[0]?.content?.parts?.map(p => p.text).join(' ') || "No text response.";
    throw new Error("API 未返回图片，可能拒绝了请求。响应: " + responseText);
  }

  return result;
};

// --- BP Agent Logic ---

// 第三方API的BP Agent任务（分析图片或纯文本）
const runBPAgentTaskWithThirdParty = async (file: File | null, instruction: string): Promise<string> => {
  const systemInstruction = file 
    ? `You are an AI analysis agent. 
Your task is to analyze the image based on the user's specific instruction and extract/generate the relevant information.
Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`
    : `You are an AI creative agent.
Your task is to generate creative content based on the user's instruction.
Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`;

  return chatWithThirdPartyApi(systemInstruction, instruction, file || undefined);
};

const runBPAgentTask = async (file: File | null, instruction: string, model: BPAgentModel): Promise<string> => {
    // 如果启用了第三方API，使用第三方Chat API
    if (thirdPartyConfig && thirdPartyConfig.enabled && thirdPartyConfig.apiKey) {
        return runBPAgentTaskWithThirdParty(file, instruction);
    }
    
    // 使用 Gemini API
    if (!ai) throw new Error("请先设置 Gemini API Key");
    
    // 构建内容部分
    const parts: Part[] = [];
    
    // 如果有图片，添加图片部分
    if (file) {
        const imagePart = await fileToGenerativePart(file);
        parts.push(imagePart);
    }
    
    // 添加文本指令
    parts.push({ text: instruction } as Part);

    // 根据是否有图片调整系统指令
    const systemInstruction = file
      ? `You are an AI analysis agent. 
    Your task is to analyze the image based on the user's specific instruction and extract/generate the relevant information.
    Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`
      : `You are an AI creative agent.
    Your task is to generate creative content based on the user's instruction.
    Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`;

    const response: GenerateContentResponse = await withRetry(() => 
        ai!.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        })
    );

    const text = response.text;
    if (!text) return "";
    return text.trim();
};

export const processBPTemplate = async (
    file: File | null,
    templateIdea: CreativeIdea,
    userInputs: Record<string, string>
): Promise<string> => {
    if (!templateIdea.bpFields || templateIdea.bpFields.length === 0) {
        return templateIdea.prompt;
    }

    let finalPrompt = templateIdea.prompt;
    const fields = templateIdea.bpFields;

    // 1. Run Agents (Parallel)
    const agentFields = fields.filter(f => f.type === 'agent');
    const agentPromises = agentFields.map(async (field) => {
        if (!field.agentConfig) return { id: field.id, result: '' };
        try {
            const result = await runBPAgentTask(file, field.agentConfig.instruction, field.agentConfig.model);
            return { id: field.id, result };
        } catch (e) {
            console.error(`Agent ${field.name} failed:`, e);
            return { id: field.id, result: `[Agent Error: ${field.name}]` };
        }
    });

    const agentResults = await Promise.all(agentPromises);
    const agentMap = agentResults.reduce((acc, curr) => {
        acc[curr.id] = curr.result;
        return acc;
    }, {} as Record<string, string>);

    // 2. Replace Agents in Template: {Name}
    fields.filter(f => f.type === 'agent').forEach(f => {
        const val = agentMap[f.id] || '';
        // Global replace for {Name}
        finalPrompt = finalPrompt.split(`{${f.name}}`).join(val);
    });

    // 3. Replace Manual Inputs: /Name
    fields.filter(f => f.type === 'input').forEach(f => {
        const val = userInputs[f.id] || '';
        // Global replace for /Name
        finalPrompt = finalPrompt.split(`/${f.name}`).join(val);
    });

    return finalPrompt;
};


// --- Legacy Smart Logic ---

const getSmartSystemInstruction = () => `You are a "Creative Prompt Fusion Specialist." Your goal is to merge a 'Modifier Keyword' into a 'Base Prompt' intelligently.

**Principles:**
1. **Base Prompt is Law**: Preserve the main subject and intent.
2. **Keyword is Adjective**: Treat it as a descriptive layer.
3. **Output**: ONLY the final prompt string. No explanations.`;

const getSmartPlusSystemInstruction = () => `You are a commercial **Art Director**. Synthesize a conceptual brief into a vivid scene description for a high-end product photoshoot.

**Output Rules:**
* Output ONLY the final prompt string.
* Single paragraph.
* Descriptive and professional. No markdown.`;


interface GeneratePromptParams {
    file: File;
    idea: CreativeIdea;
    keyword?: string; // For Smart
    smartPlusConfig?: SmartPlusConfig; // For Smart+
}

export const generateCreativePromptFromImage = async ({
    file,
    idea,
    keyword = '',
    smartPlusConfig,
}: GeneratePromptParams): Promise<string> => {
  // 如果启用了第三方API，使用第三方API
  const useThirdParty = thirdPartyConfig && thirdPartyConfig.enabled && thirdPartyConfig.apiKey;
  
  if (!useThirdParty && !ai) {
    throw new Error("请先设置 Gemini API Key 或配置第三方API");
  }
  
  const model = 'gemini-3-pro-preview';

  if (!file) throw new Error("请上传图片");

  // If BP, use the new processor (should be called directly, but handling here for safety)
  if (idea.isBP) {
      throw new Error("BP Mode should use processBPTemplate directly.");
  }

  let systemInstruction = '';
  let userMessage = '';

  if (idea.isSmartPlus && smartPlusConfig) {
      // Smart+ Mode
      systemInstruction = getSmartPlusSystemInstruction();
      userMessage += `Story Brief:
"""
${idea.prompt}
"""

`;
      if (keyword.trim()) {
          userMessage += `Keywords:
"""
${keyword}
"""

`;
      }
      userMessage += `Key Elements:\n`;
      
      const templateConfig = idea.smartPlusConfig || [];
      
      templateConfig.forEach(templateComponent => {
        if (templateComponent.enabled) {
          const overrideComponent = smartPlusConfig.find(c => c.id === templateComponent.id);
  
          if (overrideComponent && overrideComponent.enabled) {
            const featureText = overrideComponent.features.trim() || 'Describe creatively based on the Story Brief';
            userMessage += `- ${overrideComponent.label}: ${featureText}\n`;
          } else {
            userMessage += `- ${templateComponent.label}: [GENERATE CREATIVELY]\n`;
          }
        }
      });
  } else {
      // Standard Smart Mode (Legacy support or simple mode)
      systemInstruction = getSmartSystemInstruction();
      userMessage += `Base Prompt:
"""
${idea.prompt}
"""

Modifier Keyword:
"""
${keyword}
"""

`;
  }
  
  userMessage += "\n\nNow, based on the provided image and all the rules, generate the final, synthesized prompt.";
  
  // 使用第三方API进行图片分析
  if (useThirdParty) {
    return chatWithThirdPartyApi(systemInstruction, userMessage, file);
  }
  
  // 使用 Gemini API
  const imagePart = await fileToGenerativePart(file);
  const textPart: Part = { text: userMessage };

  const contents = {
    parts: [imagePart, textPart],
  };

  const response: GenerateContentResponse = await withRetry(() => 
    ai!.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    })
  );
  
  const resultText = response.text;

  if (!resultText) {
    throw new Error("API 未返回文本响应");
  }

  return resultText.trim();
};
