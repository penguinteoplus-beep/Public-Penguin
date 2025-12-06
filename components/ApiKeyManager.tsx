import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ThirdPartyApiConfig } from '../types';

interface ApiKeyManagerProps {
  apiKey: string;
  onApiKeySave: (key: string) => void;
  thirdPartyConfig: ThirdPartyApiConfig;
  onThirdPartyConfigChange: (config: ThirdPartyApiConfig) => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ 
  apiKey, 
  onApiKeySave,
  thirdPartyConfig,
  onThirdPartyConfigChange 
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  
  // 第三方API配置输入
  const [tpBaseUrl, setTpBaseUrl] = useState(thirdPartyConfig.baseUrl);
  const [tpApiKey, setTpApiKey] = useState('');
  const [tpChatModel, setTpChatModel] = useState(thirdPartyConfig.chatModel || 'gemini-2.5-pro');
  const [isTpKeySet, setIsTpKeySet] = useState(false);

  useEffect(() => {
    setIsKeySet(!!apiKey);
  }, [apiKey]);
  
  useEffect(() => {
    setTpBaseUrl(thirdPartyConfig.baseUrl);
    setTpChatModel(thirdPartyConfig.chatModel || 'gemini-2.5-pro');
    setIsTpKeySet(!!thirdPartyConfig.apiKey);
  }, [thirdPartyConfig]);
  
  const handleSave = () => {
    if (!keyInput.trim()) return;
    onApiKeySave(keyInput);
    setKeyInput('');
  };
  
  const handleThirdPartyToggle = (enabled: boolean) => {
    onThirdPartyConfigChange({
      ...thirdPartyConfig,
      enabled
    });
  };
  
  const handleThirdPartySave = () => {
    const newConfig: ThirdPartyApiConfig = {
      ...thirdPartyConfig,
      baseUrl: tpBaseUrl.trim(),
      apiKey: tpApiKey.trim() || thirdPartyConfig.apiKey,
      model: 'nano-banana-2',
      chatModel: tpChatModel.trim() || 'gemini-2.5-pro'
    };
    onThirdPartyConfigChange(newConfig);
    setTpApiKey('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 第三方API开关 */}
      <div className="flex items-center justify-between group">
        <label htmlFor="third-party-toggle" className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors flex items-center gap-2 cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          第三方API
        </label>
        <div className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            id="third-party-toggle" 
            className="sr-only peer" 
            checked={thirdPartyConfig.enabled} 
            onChange={(e) => handleThirdPartyToggle(e.target.checked)}
          />
          <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600 transition-colors"></div>
        </div>
      </div>
      
      {/* 第三方API配置区域 */}
      {thirdPartyConfig.enabled && (
        <div className="flex flex-col gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-400">第三方API配置</span>
            {isTpKeySet && (
              <div className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>已配置</span>
              </div>
            )}
          </div>
          
          {/* Base URL */}
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Base URL</label>
            <input
              type="text"
              value={tpBaseUrl}
              onChange={(e) => setTpBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full p-2 bg-gray-900/80 border border-gray-600 rounded-md text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
            />
          </div>
          
          {/* API Key */}
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">API Key</label>
            <input
              type="password"
              value={tpApiKey}
              onChange={(e) => setTpApiKey(e.target.value)}
              placeholder={isTpKeySet ? "输入新 Key 更新" : "输入第三方 API Key"}
              className="w-full p-2 bg-gray-900/80 border border-gray-600 rounded-md text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
            />
          </div>
          
          {/* Chat Model - 用于BP智能体分析 */}
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">分析模型 (BP/Smart模式)</label>
            <input
              type="text"
              value={tpChatModel}
              onChange={(e) => setTpChatModel(e.target.value)}
              placeholder="gemini-2.5-pro"
              className="w-full p-2 bg-gray-900/80 border border-gray-600 rounded-md text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
            />
          </div>
          
          <button
            onClick={handleThirdPartySave}
            disabled={!tpBaseUrl.trim()}
            className="w-full py-2 bg-orange-600 text-white font-semibold rounded-lg text-xs shadow-md hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            保存配置
          </button>
          
          <p className="text-[10px] text-gray-500 leading-relaxed">
            图片生成使用 nano-banana-2，BP智能体使用分析模型进行图片理解。
          </p>
        </div>
      )}
      
      {/* Gemini API Key 配置 */}
      {!thirdPartyConfig.enabled && (
        <>
          <div className="flex items-center justify-between">
            <label htmlFor="api-key" className="text-sm font-medium text-gray-300">
              Gemini API Key
            </label>
            {isKeySet && (
              <div className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>已设置</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              id="api-key"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={isKeySet ? "输入新 Key 更新" : "在此输入您的 API Key"}
              className="w-full flex-grow p-2 bg-gray-900/80 border border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            />
            <button
              onClick={handleSave}
              disabled={!keyInput}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm shadow-md hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
          </div>
        </>
      )}
    </div>
  );
};