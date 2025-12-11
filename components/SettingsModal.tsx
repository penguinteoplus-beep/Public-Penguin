import React, { useState, useEffect } from 'react';
import { ThirdPartyApiConfig } from '../types';
import { useTheme, ThemeName } from '../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 云服务模式（登录）
  isLoggedIn: boolean;
  onLoginClick: () => void;
  // API 配置
  thirdPartyConfig: ThirdPartyApiConfig;
  onThirdPartyConfigChange: (config: ThirdPartyApiConfig) => void;
  geminiApiKey: string;
  onGeminiApiKeySave: (key: string) => void;
  // 自动保存
  autoSaveEnabled: boolean;
  onAutoSaveToggle: (enabled: boolean) => void;
}

type ApiMode = 'cloud' | 'local-thirdparty' | 'local-gemini';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isLoggedIn,
  onLoginClick,
  thirdPartyConfig,
  onThirdPartyConfigChange,
  geminiApiKey,
  onGeminiApiKeySave,
  autoSaveEnabled,
  onAutoSaveToggle,
}) => {
  const { themeName, setTheme, allThemes } = useTheme();
  
  // 确定当前模式 - 根据实际配置自动选择
  const getCurrentMode = (): ApiMode => {
    // 优先级：
    // 1. 如果本地配置了贞贞API（有apiKey和baseUrl），用本地贞贞
    if (thirdPartyConfig.enabled && thirdPartyConfig.apiKey && thirdPartyConfig.baseUrl) {
      return 'local-thirdparty';
    }
    // 2. 如果本地配置了Gemini API Key，用本地Gemini
    if (!thirdPartyConfig.enabled && geminiApiKey) {
      return 'local-gemini';
    }
    // 3. 如果已登录且启用了thirdParty（但没有本地key），用云端
    if (isLoggedIn && thirdPartyConfig.enabled) {
      return 'cloud';
    }
    // 4. 已登录默认用云端
    if (isLoggedIn) {
      return 'cloud';
    }
    // 5. 未登录默认用本地Gemini
    return 'local-gemini';
  };

  const [activeMode, setActiveMode] = useState<ApiMode>(getCurrentMode());
  const [localThirdPartyUrl, setLocalThirdPartyUrl] = useState(thirdPartyConfig.baseUrl || '');
  const [localThirdPartyKey, setLocalThirdPartyKey] = useState(thirdPartyConfig.apiKey || '');
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // 响应 props 变化，重新计算当前模式
  useEffect(() => {
    setActiveMode(getCurrentMode());
  }, [isLoggedIn, thirdPartyConfig.enabled, thirdPartyConfig.apiKey, thirdPartyConfig.baseUrl, geminiApiKey]);

  // 同步本地输入状态
  useEffect(() => {
    setLocalThirdPartyUrl(thirdPartyConfig.baseUrl || '');
    setLocalThirdPartyKey(thirdPartyConfig.apiKey || '');
  }, [thirdPartyConfig.baseUrl, thirdPartyConfig.apiKey]);

  useEffect(() => {
    setLocalGeminiKey(geminiApiKey || '');
  }, [geminiApiKey]);

  if (!isOpen) return null;

  const handleModeChange = (mode: ApiMode) => {
    setActiveMode(mode);
    
    if (mode === 'cloud') {
      // 云模式：使用后端配置的 API
      onThirdPartyConfigChange({
        ...thirdPartyConfig,
        enabled: true,
        apiKey: '', // 云模式不需要前端存储 key
        baseUrl: '', // 云模式使用后端配置
      });
    } else if (mode === 'local-thirdparty') {
      // 本地第三方 API 模式
      onThirdPartyConfigChange({
        ...thirdPartyConfig,
        enabled: true,
        apiKey: localThirdPartyKey,
        baseUrl: localThirdPartyUrl,
      });
    } else {
      // 本地 Gemini 模式
      onThirdPartyConfigChange({
        ...thirdPartyConfig,
        enabled: false,
      });
      if (localGeminiKey) {
        onGeminiApiKeySave(localGeminiKey);
      }
    }
  };

  const handleSaveLocalThirdParty = () => {
    onThirdPartyConfigChange({
      ...thirdPartyConfig,
      enabled: true,
      apiKey: localThirdPartyKey,
      baseUrl: localThirdPartyUrl,
    });
    setSaveSuccessMessage('贞贞 API 配置已保存 ✅');
    setTimeout(() => setSaveSuccessMessage(null), 2000);
  };

  const handleSaveGeminiKey = () => {
    onGeminiApiKeySave(localGeminiKey);
    setSaveSuccessMessage('Gemini API Key 已保存 ✅');
    setTimeout(() => setSaveSuccessMessage(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in">
        {/* 保存成功提示 */}
        {saveSuccessMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500/90 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in">
            {saveSuccessMessage}
          </div>
        )}
        {/* 头部 */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">设置</h2>
              <p className="text-sm text-gray-400 mt-1">配置 API 连接方式</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* API 模式选择 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">API 连接方式</h3>
            
            {/* 云服务模式 - 推荐 */}
            <div
              onClick={() => {
                if (!isLoggedIn) {
                  onLoginClick();
                } else {
                  handleModeChange('cloud');
                }
              }}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                activeMode === 'cloud' && isLoggedIn
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeMode === 'cloud' && isLoggedIn ? 'bg-indigo-500' : 'bg-gray-700'
                }`}>
                  <span className="text-xl">☁️</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">云服务模式</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full">
                      推荐
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    登录后使用云端 API，享受云创意库、历史同步等功能
                  </p>
                  {!isLoggedIn && (
                    <button className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                      点击登录 →
                    </button>
                  )}
                  {isLoggedIn && activeMode === 'cloud' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      已连接
                    </div>
                  )}
                </div>
              </div>
              {/* 选中指示器 */}
              {activeMode === 'cloud' && isLoggedIn && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* 本地贞贞 API 模式 */}
            <div
              onClick={() => handleModeChange('local-thirdparty')}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                activeMode === 'local-thirdparty'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeMode === 'local-thirdparty' ? 'bg-orange-500' : 'bg-gray-700'
                }`}>
                  <span className="text-xl">🔌</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">贞贞 API</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    使用贞贞 API，支持 nano-banana 等模型
                  </p>
                </div>
              </div>
              {activeMode === 'local-thirdparty' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* 本地贞贞 API 配置表单 */}
            {activeMode === 'local-thirdparty' && (
              <div className="ml-14 space-y-3 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">API 地址</label>
                  <input
                    type="text"
                    value={localThirdPartyUrl}
                    onChange={(e) => setLocalThirdPartyUrl(e.target.value)}
                    placeholder="https://ai.t8star.cn"
                    className="w-full px-3 py-2 text-sm bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={localThirdPartyKey}
                      onChange={(e) => setLocalThirdPartyKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 pr-10 text-sm bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSaveLocalThirdParty}
                  className="w-full py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  保存配置
                </button>
              </div>
            )}

            {/* 本地 Gemini API 模式 */}
            <div
              onClick={() => handleModeChange('local-gemini')}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                activeMode === 'local-gemini'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeMode === 'local-gemini' ? 'bg-purple-500' : 'bg-gray-700'
                }`}>
                  <span className="text-xl">💎</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">Gemini API</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    使用 Google Gemini API Key，直接从浏览器请求
                  </p>
                </div>
              </div>
              {activeMode === 'local-gemini' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* 本地 Gemini API 配置表单 */}
            {activeMode === 'local-gemini' && (
              <div className="ml-14 space-y-3 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Gemini API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={localGeminiKey}
                      onChange={(e) => setLocalGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-3 py-2 pr-10 text-sm bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSaveGeminiKey}
                  className="w-full py-2 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  保存配置
                </button>
              </div>
            )}
          </div>

          {/* 分割线 */}
          <div className="border-t border-white/10" />

          {/* 主题设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">主题设置</h3>
            
            <div className="grid grid-cols-4 gap-3">
              {allThemes.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTheme(t.name)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    themeName === t.name
                      ? 'border-white/40 bg-white/10 ring-2 ring-white/20'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  <div className="text-3xl text-center mb-2">{t.icon}</div>
                  <p className="text-xs text-center text-gray-300 font-medium">{t.displayName}</p>
                  {themeName === t.name && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* 圣诞主题提示 */}
            {themeName === 'christmas' && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-fade-in">
                <span className="text-2xl">🎄</span>
                <p className="text-xs text-red-300">圣诞快乐！🎁</p>
              </div>
            )}
          </div>

          {/* 分割线 */}
          <div className="border-t border-white/10" />

          {/* 其他设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">其他设置</h3>
            
            {/* 自动保存 */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xl">💾</span>
                <div>
                  <h4 className="text-sm font-medium text-white">自动保存</h4>
                  <p className="text-xs text-gray-400">生成图片后自动下载到本地</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={autoSaveEnabled} 
                  onChange={(e) => onAutoSaveToggle(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
              </label>
            </div>

            {/* 当前模型显示 */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xl">🤖</span>
                <div>
                  <h4 className="text-sm font-medium text-white">当前模型</h4>
                  <p className="text-xs text-gray-400">正在使用的 AI 模型</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                activeMode === 'cloud' || activeMode === 'local-thirdparty'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}>
                {activeMode === 'cloud' || activeMode === 'local-thirdparty' 
                  ? thirdPartyConfig.model || 'nano-banana-2' 
                  : 'Gemini 3 Pro'}
              </span>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="p-6 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            完成
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};
