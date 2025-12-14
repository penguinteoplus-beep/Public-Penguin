
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { GeneratedImageDisplay } from './components/GeneratedImageDisplay';
import { editImageWithGemini, generateCreativePromptFromImage, initializeAiClient, processBPTemplate, setThirdPartyConfig } from './services/geminiService';
import { ApiStatus, GeneratedContent, CreativeIdea, SmartPlusConfig, ThirdPartyApiConfig, GenerationHistory, DesktopItem, DesktopImageItem, DesktopFolderItem } from './types';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { AddCreativeIdeaModal } from './components/AddCreativeIdeaModal';
import { SettingsModal } from './components/SettingsModal';
import { CreativeLibrary } from './components/CreativeLibrary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LibraryIcon } from './components/icons/LibraryIcon';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { PlusCircleIcon } from './components/icons/PlusCircleIcon';
import { GenerateButton } from './components/GenerateButton';
import { PenguinIcon } from './components/icons/PenguinIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { LightbulbIcon } from './components/icons/LightbulbIcon';
import { HistoryStrip } from './components/HistoryStrip';
import { AuthModal } from './components/AuthModal';
import { RechargeModal } from './components/RechargeModal';
import { User, getCurrentUser, logout as apiLogout, isLoggedIn } from './services/api/auth';
import * as creativeIdeasApi from './services/api/creativeIdeas';
import * as historyApi from './services/api/history';
import * as coinsApi from './services/api/coins';
import { PriceConfig } from './types';
import { ThemeProvider, useTheme, SnowfallEffect } from './contexts/ThemeContext';
import { Desktop, createDesktopItemFromHistory, TOP_OFFSET } from './components/Desktop';
import { HistoryDock } from './components/HistoryDock';


interface LeftPanelProps {
  files: File[];
  activeFileIndex: number | null;
  onFileSelection: (files: FileList | null) => void;
  onFileRemove: (index: number) => void;
  onFileSelect: (index: number) => void;
  onTriggerUpload: () => void;
  // 用户认证相关
  currentUser: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onRechargeClick: () => void;
  onSettingsClick: () => void;
  // 当前 API 模式状态
  currentApiMode: 'cloud' | 'local-thirdparty' | 'local-gemini';
  // 参数与提示词相关 (从RightPanel移入)
  prompt: string;
  setPrompt: (value: string) => void;
  activeSmartTemplate: CreativeIdea | null;
  activeSmartPlusTemplate: CreativeIdea | null;
  activeBPTemplate: CreativeIdea | null;
  bpInputs: Record<string, string>;
  setBpInput: (id: string, value: string) => void;
  smartPlusOverrides: SmartPlusConfig;
  setSmartPlusOverrides: (config: SmartPlusConfig) => void;
  handleGenerateSmartPrompt: () => void;
  canGenerateSmartPrompt: boolean;
  smartPromptGenStatus: ApiStatus;
  onCancelSmartPrompt: () => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  imageSize: string;
  setImageSize: (value: string) => void;
  isThirdPartyApiEnabled: boolean;
  onClearTemplate: () => void;
}

interface RightPanelProps {
  // 创意库相关
  creativeIdeas: CreativeIdea[];
  handleUseCreativeIdea: (idea: CreativeIdea) => void;
  setAddIdeaModalOpen: (isOpen: boolean) => void;
  setView: (view: 'editor' | 'library') => void;
  onDeleteIdea: (id: number) => void;
  onEditIdea: (idea: CreativeIdea) => void;
}

interface CanvasProps {
  view: 'editor' | 'library';
  setView: (view: 'editor' | 'library') => void;
  files: File[];
  onUploadClick: () => void;
  creativeIdeas: CreativeIdea[];
  onBack: () => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onEdit: (idea: CreativeIdea) => void;
  onUse: (idea: CreativeIdea) => void;
  status: ApiStatus;
  error: string | null;
  content: GeneratedContent | null;
  onPreviewClick: (url: string) => void;
  onExportIdeas: () => void;
  onImportIdeas: () => void;
  onReorderIdeas: (ideas: CreativeIdea[]) => void;
  onEditAgain?: () => void; // 再次编辑
  onRegenerate?: () => void; // 重新生成
  onDismissResult?: () => void; // 关闭结果浮层
  // 故事系统相关
  prompt?: string;
  imageSize?: string;
  // 历史记录相关
  history: GenerationHistory[];
  onHistorySelect: (item: GenerationHistory) => void;
  onHistoryDelete: (id: number) => void;
  onHistoryClear: () => void;
  // 框面模式相关
  desktopItems: DesktopItem[];
  onDesktopItemsChange: (items: DesktopItem[]) => void;
  onDesktopImageDoubleClick: (item: DesktopImageItem) => void;
  desktopSelectedIds: string[];
  onDesktopSelectionChange: (ids: string[]) => void;
  openFolderId: string | null;
  onFolderOpen: (id: string) => void;
  onFolderClose: () => void;
  openStackId: string | null; // 叠放打开状态
  onStackOpen: (id: string) => void;
  onStackClose: () => void;
  onRenameItem: (id: string, newName: string) => void;
  // 图片操作回调
  onDesktopImagePreview?: (item: DesktopImageItem) => void;
  onDesktopImageEditAgain?: (item: DesktopImageItem) => void;
  onDesktopImageRegenerate?: (item: DesktopImageItem) => void;
}

// --- IndexedDB Service ---
const DB_NAME = 'PenguinElloDB';
const DB_VERSION = 3; // Incremented for history store
const STORE_NAME = 'creativeIdeas';
const HISTORY_STORE_NAME = 'generationHistory';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error("Error opening DB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const getAllFromDB = async (): Promise<CreativeIdea[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(new Error("Error fetching all ideas from DB."));
    request.onsuccess = () => resolve(request.result);
  });
};

const saveToDB = async (idea: CreativeIdea) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(idea);
    request.onerror = () => reject(new Error("Error saving idea to DB."));
    request.onsuccess = () => resolve();
  });
};

const deleteFromDB = async (id: number) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(new Error("Error deleting idea from DB."));
    request.onsuccess = () => resolve();
  });
};

const importToDB = async (ideas: CreativeIdea[]) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        if (ideas.length === 0) return resolve();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error("Import transaction failed."));
        ideas.forEach(idea => {
            if (idea.order === undefined) {
                idea.order = idea.id;
            }
            store.put(idea);
        });
    });
};

// --- History IndexedDB Operations ---
const getAllHistoryFromDB = async (): Promise<GenerationHistory[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE_NAME, 'readonly');
    const store = transaction.objectStore(HISTORY_STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(new Error("Error fetching history from DB."));
    request.onsuccess = () => resolve(request.result);
  });
};

const saveHistoryToDB = async (item: GenerationHistory) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE_NAME);
    const request = store.put(item);
    request.onerror = () => reject(new Error("Error saving history to DB."));
    request.onsuccess = () => resolve();
  });
};

const deleteHistoryFromDB = async (id: number) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(new Error("Error deleting history from DB."));
    request.onsuccess = () => resolve();
  });
};

const clearAllHistoryFromDB = async () => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(new Error("Error clearing history from DB."));
    request.onsuccess = () => resolve();
  });
};
// --- End History IndexedDB Operations ---
// --- End IndexedDB Service ---


const LeftPanel: React.FC<LeftPanelProps> = ({
  files,
  activeFileIndex,
  onFileSelection,
  onFileRemove,
  onFileSelect,
  onTriggerUpload,
  currentUser,
  onLoginClick,
  onLogout,
  onRechargeClick,
  onSettingsClick,
  currentApiMode,
  // 参数与提示词
  prompt,
  setPrompt,
  activeSmartTemplate,
  activeSmartPlusTemplate,
  activeBPTemplate,
  bpInputs,
  setBpInput,
  smartPlusOverrides,
  setSmartPlusOverrides,
  handleGenerateSmartPrompt,
  canGenerateSmartPrompt,
  smartPromptGenStatus,
  onCancelSmartPrompt,
  aspectRatio,
  setAspectRatio,
  imageSize,
  setImageSize,
  isThirdPartyApiEnabled,
  onClearTemplate,
}) => {
  const { theme, themeName, setTheme } = useTheme();
  
  // 明暗切换
  const toggleDarkMode = () => {
    setTheme(themeName === 'light' ? 'dark' : 'light');
  };
  const isDark = themeName !== 'light';
  
  // 根据模式获取显示信息
  const getModeDisplay = () => {
    switch (currentApiMode) {
      case 'cloud':
        return {
          icon: '☁️',
          text: '云端已连接',
          bgClass: 'modern-badge primary',
        };
      case 'local-thirdparty':
        return {
          icon: '🔌',
          text: '贞贞API',
          bgClass: 'modern-badge warning',
        };
      case 'local-gemini':
        return {
          icon: '💎',
          text: 'Gemini本地',
          bgClass: 'modern-badge success',
        };
    }
  };
  
  const modeDisplay = getModeDisplay();
  
  const hasActiveTemplate = activeSmartTemplate || activeSmartPlusTemplate || activeBPTemplate;
  const activeTemplateName = activeBPTemplate?.title || activeSmartPlusTemplate?.title || activeSmartTemplate?.title;
  const activeTemplate = activeBPTemplate || activeSmartPlusTemplate || activeSmartTemplate;
  const canViewPrompt = activeTemplate?.allowViewPrompt !== false;
  const canEditPrompt = activeTemplate?.allowEditPrompt !== false;
  
  return (
  <aside 
    className="w-[280px] flex-shrink-0 flex flex-col h-full z-20 relative"
    style={{
      background: isDark 
        ? 'linear-gradient(180deg, rgba(15,15,23,0.98) 0%, rgba(10,10,15,0.99) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.99) 100%)',
      borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      backdropFilter: 'blur(20px) saturate(180%)',
    }}
  >
      {/* 微妙的内发光效果 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark 
            ? 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.04) 0%, transparent 50%)'
            : 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.03) 0%, transparent 50%)',
        }}
      />
      
      {/* 顶部导航栏 */}
      <div 
        className="relative px-4 py-3.5 flex items-center justify-between"
        style={{ 
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` 
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
            <span className="text-base">🐧</span>
          </div>
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Pebbling</h1>
            <p className="text-[9px] font-medium tracking-wide" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>AI Creative Studio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* 明暗切换 */}
          <button
            onClick={toggleDarkMode}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ 
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              color: isDark ? '#9ca3af' : '#6b7280'
            }}
            title={isDark ? '浅色' : '深色'}
          >
            {isDark ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {/* 设置按钮 */}
          <button
            onClick={onSettingsClick}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ 
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              color: isDark ? '#9ca3af' : '#6b7280'
            }}
            title="设置"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* 用户信息栏 */}
      <div 
        className="relative mx-3 mt-3 p-3 rounded-xl"
        style={{ 
          background: isDark 
            ? 'linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(25,25,35,0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.95) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: isDark 
            ? '0 4px 24px -4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)'
            : '0 4px 24px -4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <>
              {/* 头像 */}
              <div className="relative group">
                <button 
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xs shadow-lg ring-2 ring-white/10 hover:ring-white/20 hover:scale-105 transition-all"
                >
                  {currentUser.nickname?.[0] || currentUser.username[0].toUpperCase()}
                </button>
                {/* 下拉菜单 */}
                <div 
                  className="absolute left-0 top-full mt-2 w-36 p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 rounded-xl"
                  style={{
                    background: isDark ? 'rgba(20,20,28,0.98)' : 'rgba(255,255,255,0.98)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    boxShadow: isDark 
                      ? '0 10px 40px -10px rgba(0,0,0,0.5)'
                      : '0 10px 40px -10px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="p-2.5" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <p className="text-xs font-semibold truncate" style={{ color: isDark ? '#fff' : '#0f172a' }}>{currentUser.nickname || currentUser.username}</p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>{currentUser.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full px-2.5 py-2 mt-1 text-left text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    退出登录
                  </button>
                </div>
              </div>
              
              {/* 用户信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                  {currentUser.nickname || currentUser.username}
                </p>
                <div 
                  className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium"
                  style={{
                    background: currentApiMode === 'cloud' 
                      ? 'rgba(99,102,241,0.15)' 
                      : currentApiMode === 'local-thirdparty'
                      ? 'rgba(245,158,11,0.15)'
                      : 'rgba(34,197,94,0.15)',
                    color: currentApiMode === 'cloud'
                      ? '#a5b4fc'
                      : currentApiMode === 'local-thirdparty'
                      ? '#fcd34d'
                      : '#86efac',
                  }}
                >
                  <span className="text-[8px]">{modeDisplay.icon}</span>
                  <span>{modeDisplay.text}</span>
                </div>
              </div>
              
              {/* 鹅卵石余额 */}
              <button 
                onClick={onRechargeClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.15)'}`,
                }}
                title="充值"
              >
                <span className="text-sm">🪙</span>
                <span className="text-xs font-bold text-amber-400">{currentUser.coins || 0}</span>
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex-1 py-2.5 text-xs font-semibold text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                boxShadow: '0 4px 15px -3px rgba(99,102,241,0.4)',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <span>☁️</span>
                登录云端服务
              </span>
            </button>
          )}
        </div>
      </div>
      
      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 flex flex-col min-h-0">
        {/* 固定内容区域 - 资源素材 */}
        <div className="flex-shrink-0 mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>资源素材</h2>
          <ImageUploader 
            files={files}
            activeFileIndex={activeFileIndex}
            onFileChange={onFileSelection}
            onFileRemove={onFileRemove}
            onFileSelect={onFileSelect}
            onTriggerUpload={onTriggerUpload}
          />
        </div>
        
        {/* 模型参数卡片 */}
        <div 
          className="flex-shrink-0 p-3 rounded-xl mb-3"
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, rgba(30,30,40,0.6) 0%, rgba(25,25,35,0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(248,250,252,0.9) 100%)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
           <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center ring-1 ring-indigo-500/20">
                <ImageIcon className="w-3 h-3 text-indigo-400"/>
              </div>
              <h3 className="text-[11px] font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>参数配置</h3>
           </div>
           
           <div className="space-y-3">
              {/* 画面比例 */}
              <div>
                  <div className="flex justify-between mb-2">
                       <span className="text-[10px] font-medium" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>画面比例</span>
                       <span className="text-[10px] font-mono font-semibold text-indigo-400">{aspectRatio}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                      {['Auto', '1:1', '3:4', '4:3', '9:16', '16:9'].map(ratio => (
                          <button
                              key={ratio}
                              onClick={() => setAspectRatio(ratio)}
                              className={`py-1.5 text-[9px] font-semibold rounded-lg transition-all ${
                                  aspectRatio === ratio
                                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20'
                                      : `${isDark ? 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06]' : 'bg-black/[0.03] text-gray-500 hover:bg-black/[0.06]'} hover:text-indigo-400`
                              }`}
                          >
                              {ratio}
                          </button>
                      ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-1">
                      {['2:3', '3:2', '4:5', '5:4', '21:9'].map(ratio => (
                          <button
                              key={ratio}
                              onClick={() => setAspectRatio(ratio)}
                              className={`py-1.5 text-[9px] font-semibold rounded-lg transition-all ${
                                  aspectRatio === ratio
                                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20'
                                      : `${isDark ? 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06]' : 'bg-black/[0.03] text-gray-500 hover:bg-black/[0.06]'} hover:text-indigo-400`
                              }`}
                          >
                              {ratio}
                          </button>
                      ))}
                  </div>
              </div>
              
              {/* 分辨率 */}
              <div>
                  <div className="flex justify-between mb-2">
                       <span className="text-[10px] font-medium" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>分辨率</span>
                       <span className="text-[10px] font-mono font-semibold text-cyan-400">{imageSize}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                       {['1K', '2K', '4K'].map(size => (
                          <button
                              key={size}
                              onClick={() => setImageSize(size)}
                              className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                                  imageSize === size
                                      ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
                                      : `${isDark ? 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06]' : 'bg-black/[0.03] text-gray-500 hover:bg-black/[0.06]'} hover:text-cyan-400`
                              }`}
                          >
                              {size}
                          </button>
                      ))}
                  </div>
              </div>
           </div>
        </div>
        
        {/* 提示词区域 - 自动扩展到底部 */}
        <div className="flex-1 flex flex-col min-h-[150px]">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                {hasActiveTemplate ? '关键词' : '提示词'}
             </h2>
             <div className="flex items-center gap-1.5">
               {hasActiveTemplate && (
                 <div className="flex items-center gap-1">
                   <span 
                     className="px-2 py-0.5 rounded-md text-[9px] font-semibold"
                     style={{
                       background: activeBPTemplate 
                         ? 'rgba(245,158,11,0.15)'
                         : activeSmartPlusTemplate
                         ? 'rgba(34,197,94,0.15)'
                         : 'rgba(99,102,241,0.15)',
                       color: activeBPTemplate
                         ? '#fcd34d'
                         : activeSmartPlusTemplate
                         ? '#86efac'
                         : '#a5b4fc',
                     }}
                   >
                     {activeTemplateName}
                   </span>
                   <button
                     onClick={onClearTemplate}
                     className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110"
                     style={{ 
                       color: isDark ? '#6b7280' : '#9ca3af',
                     }}
                     title="卸载 (Esc)"
                   >
                     <svg className="w-3 h-3 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>
               )}
               <span 
                 className="px-2 py-0.5 rounded-md text-[9px] font-semibold"
                 style={{
                   background: isThirdPartyApiEnabled ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                   color: isThirdPartyApiEnabled ? '#fbbf24' : '#a5b4fc',
                 }}
               >
                 {isThirdPartyApiEnabled ? 'Nano' : 'Gemini'}
               </span>
             </div>
          </div>
          
          {activeBPTemplate && (
              <BPModePanel 
                   template={activeBPTemplate}
                   inputs={bpInputs}
                   onInputChange={setBpInput}
              />
          )}

          {canViewPrompt ? (
            <div className="relative group flex-1 flex flex-col">
             <textarea
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 placeholder={
                   activeBPTemplate
                     ? "生成的提示词显示在这里..."
                     : activeSmartTemplate
                     ? `"${activeSmartTemplate.title}" 关键词...`
                     : activeSmartPlusTemplate
                     ? `场景关键词 (可选)...`
                     : "描述想生成的画面..."
                 }
                 readOnly={!!activeBPTemplate || !canEditPrompt}
                 className={`w-full flex-1 min-h-[100px] p-3 pr-11 rounded-xl resize-none text-[11px] transition-all ${
                     !canEditPrompt ? 'cursor-not-allowed opacity-60' : ''
                 }`}
                 style={{
                   background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                   border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                   color: isDark ? '#fff' : '#0f172a',
                 }}
               />
               <button
                 onClick={smartPromptGenStatus === ApiStatus.Loading ? onCancelSmartPrompt : handleGenerateSmartPrompt}
                 disabled={smartPromptGenStatus !== ApiStatus.Loading && !canGenerateSmartPrompt}
                 className={`absolute top-2 right-2 w-8 h-8 rounded-lg text-white shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex items-center justify-center ring-1 ring-white/20 ${
                     smartPromptGenStatus === ApiStatus.Loading
                     ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30'
                     : activeBPTemplate 
                     ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' 
                     : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30'
                 }`}
                 title={smartPromptGenStatus === ApiStatus.Loading ? "取消" : "生成"}
               >
                   {smartPromptGenStatus === ApiStatus.Loading ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                   ) : (
                     <PenguinIcon className="w-4 h-4" />
                   )}
               </button>
            </div>
          ) : (
            <div 
              className="p-3 rounded-xl"
              style={{
                background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
                border: `1px solid ${isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.15)' }}
                >
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-amber-400">提示词已加密</span>
              </div>
              <p className="text-[10px]" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                填写输入框后点击生成即可
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* 底部免责声明 - 更简洁 */}
      <div 
        className="mx-3 mb-3 px-3 py-2 rounded-lg text-center"
        style={{ 
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        <p className="text-[9px] font-medium" style={{ color: isDark ? '#4b5563' : '#9ca3af' }}>
          ⚠️ AI 内容仅供学习测试
        </p>
      </div>
  </aside>
  );
};

const SmartPlusDirector: React.FC<{
    config: SmartPlusConfig;
    onConfigChange: (config: SmartPlusConfig) => void;
    templateConfig?: SmartPlusConfig;
}> = ({ config, onConfigChange, templateConfig }) => {
    const { themeName } = useTheme();
    const isDark = themeName !== 'light';
    
    const handleConfigChange = (
        id: number,
        field: 'enabled' | 'features',
        value: boolean | string
    ) => {
        onConfigChange(
            config.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const visibleComponents = config.filter(component => {
        const templateComponent = templateConfig?.find(t => t.id === component.id);
        return templateComponent?.enabled;
    });

    if (visibleComponents.length === 0) {
        return null;
    }

    return (
        <div 
          className="p-3 rounded-xl"
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(20,184,166,0.04) 100%)'
              : 'rgba(20,184,166,0.06)',
            border: `1px solid ${isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.1)'}`,
          }}
        >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <LightbulbIcon className="w-3 h-3 text-teal-400"/>
              </div>
              <h3 className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>导演模式</h3>
            </div>
            <div className="space-y-3">
            {visibleComponents.map(component => (
                <div key={component.id} className="flex items-start gap-2">
                    <label className="relative inline-flex items-center cursor-pointer pt-0.5" htmlFor={`smart-plus-override-${component.id}`}>
                        <input
                            type="checkbox"
                            id={`smart-plus-override-${component.id}`}
                            className="sr-only peer"
                            checked={component.enabled}
                            onChange={(e) => handleConfigChange(component.id, 'enabled', e.target.checked)}
                        />
                         <div 
                           className="w-7 h-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500 transition-colors"
                           style={{ background: isDark ? '#374151' : '#d1d5db' }}
                         ></div>
                    </label>
                    <div className="flex-grow">
                        <label 
                          htmlFor={`smart-plus-override-${component.id}-features`} 
                          className="text-[10px] font-medium mb-1 block"
                          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                        >
                            {component.label}
                        </label>
                        <textarea
                            id={`smart-plus-override-${component.id}-features`}
                            value={component.features}
                            onChange={(e) => handleConfigChange(component.id, 'features', e.target.value)}
                            className="w-full text-xs p-2 rounded-lg resize-none transition-all"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                              color: isDark ? '#fff' : '#0f172a',
                            }}
                            placeholder={component.enabled ? '描述...' : '自动'}
                            disabled={!component.enabled}
                            rows={2}
                        />
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
};

const BPModePanel: React.FC<{
    template: CreativeIdea;
    inputs: Record<string, string>;
    onInputChange: (id: string, value: string) => void;
}> = ({ template, inputs, onInputChange }) => {
    const { themeName } = useTheme();
    const isDark = themeName !== 'light';
    
    // Only show manual inputs (type === 'input')
    const manualFields = template.bpFields?.filter(f => f.type === 'input') || [];
    const agentFields = template.bpFields?.filter(f => f.type === 'agent') || [];

    if (manualFields.length === 0 && agentFields.length === 0) return null;

    return (
        <div 
          className="p-3 mb-3 rounded-xl"
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 100%)'
              : 'rgba(245,158,11,0.06)',
            border: `1px solid ${isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)'}`,
          }}
        >
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <span className="text-[10px]">⚡</span>
                  </div>
                  <h3 className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>BP 模式</h3>
                </div>
                {agentFields.length > 0 && (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-1"
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: '#a5b4fc',
                    }}
                  >
                    <LightbulbIcon className="w-2.5 h-2.5"/> {agentFields.length}
                  </span>
                )}
             </div>
             
             <div className="space-y-2">
             {manualFields.length > 0 ? manualFields.map(v => (
                 <div key={v.id}>
                     <label 
                       className="text-[10px] font-medium mb-1 flex justify-between"
                       style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                     >
                        <span>{v.label}</span>
                        <span className="text-[9px] font-mono" style={{ color: 'rgba(245,158,11,0.6)' }}>/{v.name}</span>
                     </label>
                     <input 
                        type="text"
                        value={inputs[v.id] || ''}
                        onChange={(e) => onInputChange(v.id, e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg transition-all"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'}`,
                          color: isDark ? '#fff' : '#0f172a',
                        }}
                        placeholder={`输入 ${v.label}...`}
                     />
                 </div>
             )) : (
                 <p 
                   className="text-[10px] italic p-2 rounded text-center"
                   style={{ 
                     background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                     color: isDark ? '#6b7280' : '#9ca3af',
                   }}
                 >
                   仅含智能体，点击生成自动运行
                 </p>
             )}
             </div>
        </div>
    );
}

const RightPanel: React.FC<RightPanelProps> = ({
  creativeIdeas,
  handleUseCreativeIdea,
  setAddIdeaModalOpen,
  setView,
  onDeleteIdea,
  onEditIdea,
}) => {
  const { theme } = useTheme();
  
  // 按类型分组创意库
  const smartIdeas = creativeIdeas.filter(idea => idea.isSmart && !idea.isSmartPlus && !idea.isBP);
  const smartPlusIdeas = creativeIdeas.filter(idea => idea.isSmartPlus);
  const bpIdeas = creativeIdeas.filter(idea => idea.isBP);
  
  // 渲染单个创意项
  const renderIdeaItem = (idea: CreativeIdea) => (
    <div
      key={idea.id}
      className="group liquid-card p-2 hover:border-indigo-500/30 transition-all cursor-pointer"
      onClick={() => handleUseCreativeIdea(idea)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {idea.imageUrl ? (
            <img src={idea.imageUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
          ) : (
            <span className="text-sm flex-shrink-0">✨</span>
          )}
          <span className="text-[11px] font-medium truncate" style={{ color: theme.colors.textPrimary }}>
            {idea.title}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEditIdea(idea); }}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
            title="编辑"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteIdea(idea.id); }}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="删除"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
  
  const renderGroup = (title: string, ideas: CreativeIdea[], badge: string, badgeClass: string) => {
    if (ideas.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium" style={{ color: theme.colors.textMuted }}>{title}</span>
          <span className={`liquid-badge ${badgeClass}`}>{ideas.length}</span>
        </div>
        <div className="space-y-1.5">
          {ideas.slice(0, 5).map(renderIdeaItem)}
          {ideas.length > 5 && (
            <button 
              onClick={() => setView('library')}
              className="w-full py-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              查看全部 {ideas.length} 个...
            </button>
          )}
        </div>
      </div>
    );
  };
  
  return (
  <aside className="w-[220px] flex-shrink-0 flex flex-col h-full liquid-panel border-l z-20">
     {/* 标题栏 */}
     <div className="liquid-panel-section flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-purple-500/15 flex items-center justify-center">
            <LibraryIcon className="w-3 h-3 text-purple-400"/>
          </div>
          <h2 className="text-[12px] font-semibold" style={{ color: theme.colors.textPrimary }}>创意库</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAddIdeaModalOpen(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-105 press-scale"
            style={{ 
              background: 'var(--glass-bg)',
              color: theme.colors.textSecondary 
            }}
            title="新建创意"
          >
            <PlusCircleIcon className="w-3 h-3" />
          </button>
          <button
            onClick={() => setView('library')}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-105 press-scale"
            style={{ 
              background: 'var(--glass-bg)',
              color: theme.colors.textSecondary 
            }}
            title="全部创意库"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
     </div>
     
     {/* 创意列表 */}
     <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {creativeIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
              <LibraryIcon className="w-6 h-6 text-purple-400"/>
            </div>
            <p className="text-[11px] font-medium" style={{ color: theme.colors.textPrimary }}>还没有创意</p>
            <p className="text-[10px] mt-1" style={{ color: theme.colors.textMuted }}>点击右上角创建第一个</p>
            <button
              onClick={() => setAddIdeaModalOpen(true)}
              className="mt-4 px-4 py-2 liquid-btn text-[11px]"
            >
              <PlusCircleIcon className="w-3.5 h-3.5 mr-1.5" />
              新建创意
            </button>
          </div>
        ) : (
          <>
            {renderGroup('BP 模式', bpIdeas, 'BP', 'warning')}
            {renderGroup('Smart+', smartPlusIdeas, 'S+', 'success')}
            {renderGroup('Smart', smartIdeas, 'S', 'primary')}
          </>
        )}
     </div>
     
     {/* 底部统计 */}
     {creativeIdeas.length > 0 && (
       <div className="mx-3 mb-3 px-2.5 py-2 liquid-card">
         <div className="flex items-center justify-between text-[10px]">
           <span style={{ color: theme.colors.textMuted }}>共 {creativeIdeas.length} 个创意</span>
           <button
             onClick={() => setView('library')}
             className="text-indigo-400 hover:text-indigo-300 transition-colors"
           >
             管理全部 →
           </button>
         </div>
       </div>
     )}
  </aside>
);
};

const Canvas: React.FC<CanvasProps> = ({
  view,
  setView,
  files,
  onUploadClick,
  creativeIdeas,
  onBack,
  onAdd,
  onDelete,
  onEdit,
  onUse,
  status,
  error,
  content,
  onPreviewClick,
  onExportIdeas,
  onImportIdeas,
  onReorderIdeas,
  onEditAgain,
  onRegenerate,
  onDismissResult,
  prompt,
  imageSize,
  history,
  onHistorySelect,
  onHistoryDelete,
  onHistoryClear,
  desktopItems,
  onDesktopItemsChange,
  onDesktopImageDoubleClick,
  desktopSelectedIds,
  onDesktopSelectionChange,
  openFolderId,
  onFolderOpen,
  onFolderClose,
  openStackId,
  onStackOpen,
  onStackClose,
  onRenameItem,
  onDesktopImagePreview,
  onDesktopImageEditAgain,
  onDesktopImageRegenerate,
  onGenerateFromFlow,
  onSaveImageFromFlow,
  onCanvasClick,
}) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName !== 'light';
  
  return (
   <main 
     className="flex-1 flex flex-col min-w-0 relative overflow-hidden select-none" 
     style={{ backgroundColor: theme.colors.bgPrimary }}
     onDragStart={(e) => e.preventDefault()}
   >
      {/* 背景效果 - 适配明暗主题 */}
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-gray-950 to-purple-950/10 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),transparent)] pointer-events-none"></div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] pointer-events-none"></div>
        </>
      )}
      
      {/* 顶部切换标签 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 liquid-tabs">
        <button
          onClick={() => setView('editor')}
          className={`liquid-tab flex items-center gap-1 ${
            view === 'editor' ? 'active' : ''
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          桌面
        </button>
        <button
          onClick={() => setView('library')}
          className={`liquid-tab flex items-center gap-1 ${
            view === 'library' ? 'active' : ''
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          创意库
          {creativeIdeas.length > 0 && (
            <span className="px-1 py-0.5 text-[8px] rounded bg-white/20 font-medium">
              {creativeIdeas.length}
            </span>
          )}
        </button>

      </div>
      
      {view === 'library' ? (
        <div className="relative z-10 w-full flex-1 p-8 pt-16 flex flex-col overflow-hidden">
          <CreativeLibrary
            ideas={creativeIdeas}
            onBack={onBack}
            onAdd={onAdd}
            onDelete={onDelete}
            onEdit={onEdit}
            onUse={onUse}
            onExport={onExportIdeas}
            onImport={onImportIdeas}
            onReorder={onReorderIdeas}
          />
        </div>
      ) : (
        /* 桌面模式 - 始终显示 */
        <div className="relative z-10 flex-1 overflow-hidden">
          <Desktop
            items={desktopItems}
            onItemsChange={onDesktopItemsChange}
            onImageDoubleClick={onDesktopImageDoubleClick}
            onFolderDoubleClick={(folder) => onFolderOpen(folder.id)}
            onStackDoubleClick={(stack) => onStackOpen(stack.id)}
            openFolderId={openFolderId}
            onFolderClose={onFolderClose}
            openStackId={openStackId}
            onStackClose={onStackClose}
            selectedIds={desktopSelectedIds}
            onSelectionChange={onDesktopSelectionChange}
            onRenameItem={onRenameItem}
            onImagePreview={onDesktopImagePreview}
            onImageEditAgain={onDesktopImageEditAgain}
            onImageRegenerate={onDesktopImageRegenerate}
            history={history}
            creativeIdeas={creativeIdeas}
          />
          
          {/* 生成结果浮层 - 现代化设计 */}
          {(status === ApiStatus.Loading || (status === ApiStatus.Success && content) || (status === ApiStatus.Error && error)) && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 modern-card p-5 animate-scale-in">
              {/* 关闭按钮 */}
              {status !== ApiStatus.Loading && onDismissResult && (
                <button
                  onClick={onDismissResult}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-lg border border-white/10"
                  title="关闭"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <GeneratedImageDisplay
                status={status}
                error={error}
                content={content}
                onPreviewClick={onPreviewClick}
                onEditAgain={onEditAgain}
                onRegenerate={onRegenerate}
                prompt={prompt}
                imageSize={imageSize}
              />
            </div>
          )}
        </div>
      )}
   </main>
  );
};

export const defaultSmartPlusConfig: SmartPlusConfig = [
    { id: 1, label: 'Product', enabled: true, features: '' },
    { id: 2, label: 'Person', enabled: true, features: '' },
    { id: 3, label: 'Scene', enabled: true, features: '' },
];

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  const [smartPromptGenStatus, setSmartPromptGenStatus] = useState<ApiStatus>(ApiStatus.Idle);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // 取消 BP/Smart 处理
  const handleCancelSmartPrompt = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setSmartPromptGenStatus(ApiStatus.Idle);
    }
  }, [abortController]);

  const [apiKey, setApiKey] = useState<string>('');
  const [creativeIdeas, setCreativeIdeas] = useState<CreativeIdea[]>([]);
  
  const [view, setView] = useState<'editor' | 'library'>('editor'); // 默认桌面模式
  const [isAddIdeaModalOpen, setAddIdeaModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<CreativeIdea | null>(null);
  
  const [activeSmartTemplate, setActiveSmartTemplate] = useState<CreativeIdea | null>(null);
  const [activeSmartPlusTemplate, setActiveSmartPlusTemplate] = useState<CreativeIdea | null>(null);
  const [smartPlusOverrides, setSmartPlusOverrides] = useState<SmartPlusConfig>(() => JSON.parse(JSON.stringify(defaultSmartPlusConfig)));

  // BP Mode States
  const [activeBPTemplate, setActiveBPTemplate] = useState<CreativeIdea | null>(null);
  const [bpInputs, setBpInputs] = useState<Record<string, string>>({});
  
  // 当前使用的创意库（用于获取扣费金额，不论类型）
  const [activeCreativeIdea, setActiveCreativeIdea] = useState<CreativeIdea | null>(null);
  
  // No global polish switch needed for BP anymore, as agents handle intelligence
  // const [bpPolish, setBpPolish] = useState(false); 

  // New State for Model Config
  const [aspectRatio, setAspectRatio] = useState<string>('Auto');
  const [imageSize, setImageSize] = useState<string>('2K');

  const [autoSave, setAutoSave] = useState(false);
  
  // 贞贞API配置状态
  const [thirdPartyApiConfig, setThirdPartyApiConfig] = useState<ThirdPartyApiConfig>({
    enabled: false,
    baseUrl: '',
    apiKey: '',
    model: 'nano-banana-2'
  });
  
  // 历史记录状态
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([]);
  
  // 用户认证状态
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isRechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // Pebbling 鹅卵石状态 🪨
  const [priceConfig, setPriceConfig] = useState<PriceConfig>({ generateImage: 10, analyzeImage: 5, chat: 2 });

  // 桌面状态
  const [desktopItems, setDesktopItems] = useState<DesktopItem[]>([]);
  const [desktopSelectedIds, setDesktopSelectedIds] = useState<string[]>([]);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [openStackId, setOpenStackId] = useState<string | null>(null); // 叠放打开状态

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importIdeasInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      initializeAiClient(savedApiKey);
    }
    
    // 加载贞贞API配置
    const savedThirdPartyConfig = localStorage.getItem('third_party_api_config');
    if (savedThirdPartyConfig) {
      try {
        const config = JSON.parse(savedThirdPartyConfig) as ThirdPartyApiConfig;
        // 如果没有baseUrl，设置默认值
        if (!config.baseUrl) {
          config.baseUrl = 'https://ai.t8star.cn';
        }
        setThirdPartyApiConfig(config);
        setThirdPartyConfig(config);
      } catch (e) {
        console.error('Failed to parse third party API config:', e);
      }
    } else {
      // 默认配置
      const defaultConfig: ThirdPartyApiConfig = {
        enabled: false,
        baseUrl: 'https://ai.t8star.cn',
        apiKey: '',
        model: 'nano-banana-2',
        chatModel: 'gemini-2.5-pro'
      };
      setThirdPartyApiConfig(defaultConfig);
      setThirdPartyConfig(defaultConfig);
    }
    
    // 检查登录状态并加载数据
    const initializeData = async () => {
      // 检查是否已登录
      if (isLoggedIn()) {
        try {
          const userResult = await getCurrentUser();
          if (userResult.success && userResult.data) {
            setCurrentUser(userResult.data);
            // 已登录，从后端API加载数据
            await loadDataFromBackend();
          } else {
            // Token无效，从本地加载
            await loadDataFromLocal();
          }
        } catch (e) {
          console.error('Failed to verify login:', e);
          await loadDataFromLocal();
        }
      } else {
        // 未登录，从本地加载
        await loadDataFromLocal();
      }
    };
    
    initializeData();
    
    const savedAutoSave = localStorage.getItem('auto_save_enabled');
    if (savedAutoSave) {
        setAutoSave(JSON.parse(savedAutoSave));
    }
  }, []);
  
  // 从后端API加载数据
  const loadDataFromBackend = async () => {
    try {
      // 加载创意库
      const ideasResult = await creativeIdeasApi.getAllCreativeIdeas();
      if (ideasResult.success && ideasResult.data) {
        const ideas = ideasResult.data.sort((a, b) => (b.order || 0) - (a.order || 0));
        setCreativeIdeas(ideas);
      }
      
      // 加载历史记录
      const historyResult = await historyApi.getAllHistory();
      if (historyResult.success && historyResult.data) {
        const history = historyResult.data.sort((a, b) => b.timestamp - a.timestamp);
        setGenerationHistory(history);
      }
      
      // 加载价格配置
      const pricesResult = await coinsApi.getPrices();
      if (pricesResult.success && pricesResult.data) {
        setPriceConfig(pricesResult.data);
      }
    } catch (e) {
      console.error('Failed to load data from backend:', e);
    }
  };
  
  // 从本地IndexedDB加载数据
  const loadDataFromLocal = async () => {
    try {
      let ideas = await getAllFromDB();
      ideas.sort((a, b) => (b.order || 0) - (a.order || 0)); 
      setCreativeIdeas(ideas);
    } catch (e) {
      console.error("Failed to load creative ideas from DB", e);
    }
    
    try {
      let history = await getAllHistoryFromDB();
      history.sort((a, b) => b.timestamp - a.timestamp);
      setGenerationHistory(history);
    } catch (e) {
      console.error("Failed to load history from DB", e);
    }
  };
  
  // 用户登录成功处理
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    // 登录成功后，如果没有本地配置，默认切换到云端模式
    if (!thirdPartyApiConfig.apiKey && !thirdPartyApiConfig.baseUrl) {
      const cloudConfig: ThirdPartyApiConfig = {
        ...thirdPartyApiConfig,
        enabled: true,
        apiKey: '',
        baseUrl: '',
      };
      setThirdPartyApiConfig(cloudConfig);
      setThirdPartyConfig(cloudConfig);
      localStorage.setItem('third_party_api_config', JSON.stringify(cloudConfig));
    }
    // 登录成功后从后端加载数据
    await loadDataFromBackend();
  };
  
  // 刷新用户信息（包括余额）
  const refreshUserInfo = async () => {
    if (!isLoggedIn()) return;
    try {
      const result = await getCurrentUser();
      if (result.success && result.data) {
        setCurrentUser(result.data);
      }
    } catch (e) {
      console.error('Failed to refresh user info:', e);
    }
  };
  
  // 用户退出登录处理
  const handleLogout = async () => {
    apiLogout();
    setCurrentUser(null);
    // 退出后，如果没有本地配置，切换到本地Gemini模式
    if (!thirdPartyApiConfig.apiKey && !thirdPartyApiConfig.baseUrl) {
      const localConfig: ThirdPartyApiConfig = {
        ...thirdPartyApiConfig,
        enabled: false,
      };
      setThirdPartyApiConfig(localConfig);
      setThirdPartyConfig(localConfig);
      localStorage.setItem('third_party_api_config', JSON.stringify(localConfig));
    }
    // 退出后切换到本地数据
    await loadDataFromLocal();
  };

  const handleSetPrompt = (value: string) => {
    setPrompt(value);
  };

  const handleFileSelection = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'));
      setFiles(prevFiles => {
        const wasEmpty = prevFiles.length === 0;
        const updatedFiles = [...prevFiles, ...newFiles];
        if (wasEmpty && updatedFiles.length > 0) {
          setTimeout(() => setActiveFileIndex(0), 0);
        }
        return updatedFiles;
      });
    }
  }, []);

  const handleFileRemove = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    if (activeFileIndex === indexToRemove) {
      setActiveFileIndex(files.length > 1 ? 0 : null);
    } else if (activeFileIndex !== null && activeFileIndex > indexToRemove) {
      setActiveFileIndex(activeFileIndex - 1);
    }
  };

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files);
    if (event.target) {
        event.target.value = '';
    }
  }, [handleFileSelection]);

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    initializeAiClient(key);
    setError(null); 
  };
  
  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('auto_save_enabled', JSON.stringify(enabled));
  };
  
  // 贞贞API配置变更处理
  const handleThirdPartyConfigChange = (config: ThirdPartyApiConfig) => {
    setThirdPartyApiConfig(config);
    setThirdPartyConfig(config);
    localStorage.setItem('third_party_api_config', JSON.stringify(config));
  };
  
  // 历史记录操作
  const handleHistorySelect = async (item: GenerationHistory) => {
    // 恢复原始输入图片（如果有）
    let restoredInputFile: File | null = null;
    if (item.inputImageData && item.inputImageType) {
      try {
        // 将 base64 转换回 File 对象
        const byteCharacters = atob(item.inputImageData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: item.inputImageType });
        restoredInputFile = new File([blob], item.inputImageName || 'restored-input.png', { type: item.inputImageType });
        
        // 清空其他图片，仅保留恢复的输入图片
        setFiles([restoredInputFile]);
        setActiveFileIndex(0);
      } catch (e) {
        console.warn('恢复输入图片失败:', e);
      }
    } else {
      // 没有输入图片，清空文件列表
      setFiles([]);
      setActiveFileIndex(null);
    }
    
    // 恢复创意库设置（用于重新生成）
    setActiveSmartTemplate(null);
    setActiveSmartPlusTemplate(null);
    setActiveBPTemplate(null);
    setActiveCreativeIdea(null);
    setBpInputs({});
    setSmartPlusOverrides(JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
    
    if (item.creativeTemplateType && item.creativeTemplateType !== 'none' && item.creativeTemplateId) {
      const template = creativeIdeas.find(idea => idea.id === item.creativeTemplateId);
      if (template) {
        // 设置当前使用的创意库（用于扣费）
        setActiveCreativeIdea(template);
        
        if (item.creativeTemplateType === 'bp') {
          setActiveBPTemplate(template);
          if (item.bpInputs) {
            setBpInputs(item.bpInputs);
          }
        } else if (item.creativeTemplateType === 'smartPlus') {
          setActiveSmartPlusTemplate(template);
          if (item.smartPlusOverrides) {
            setSmartPlusOverrides(item.smartPlusOverrides);
          }
        } else if (item.creativeTemplateType === 'smart') {
          setActiveSmartTemplate(template);
        }
      }
    }
    
    // 设置生成的内容，并保留原始图片引用用于“重新生成”
    setGeneratedContent({ 
      imageUrl: item.imageUrl, 
      text: null,
      originalFiles: restoredInputFile ? [restoredInputFile] : [] 
    });
    setPrompt(item.prompt);
    setStatus(ApiStatus.Success);
    setView('editor'); // 切换到编辑器视图以显示图片
  };
  
  const handleHistoryDelete = async (id: number) => {
    try {
      if (currentUser) {
        // 登录状态，使用后端API
        const result = await historyApi.deleteHistory(id);
        if (!result.success) {
          throw new Error(result.error || '删除失败');
        }
      } else {
        // 未登录，使用本地IndexedDB
        await deleteHistoryFromDB(id);
      }
      setGenerationHistory(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error("Failed to delete history:", e);
    }
  };
  
  const handleHistoryClear = async () => {
    if (!confirm('确定要清空所有历史记录吗？')) return;
    try {
      if (currentUser) {
        // 登录状态，使用后端API
        const result = await historyApi.clearAllHistory();
        if (!result.success) {
          throw new Error(result.error || '清空失败');
        }
      } else {
        // 未登录，使用本地IndexedDB
        await clearAllHistoryFromDB();
      }
      setGenerationHistory([]);
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
  };
  
  const saveToHistory = async (
    imageUrl: string, 
    promptText: string, 
    isThirdParty: boolean, 
    inputFile?: File | null,
    creativeInfo?: {
      templateId?: number;
      templateType: 'smart' | 'smartPlus' | 'bp' | 'none';
      bpInputs?: Record<string, string>;
      smartPlusOverrides?: SmartPlusConfig;
    }
  ): Promise<number | undefined> => {
    // 将输入图片转换为 base64 保存
    let inputImageData: string | undefined;
    let inputImageName: string | undefined;
    let inputImageType: string | undefined;
    
    if (inputFile) {
      try {
        inputImageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(inputFile);
        });
        inputImageName = inputFile.name;
        inputImageType = inputFile.type;
      } catch (e) {
        console.warn('保存输入图片失败:', e);
      }
    }
    
    const historyId = Date.now();
    const historyItem: GenerationHistory = {
      id: historyId,
      imageUrl,
      prompt: promptText,
      timestamp: Date.now(),
      model: isThirdParty ? (thirdPartyApiConfig.model || 'nano-banana-2') : 'Gemini 3 Pro',
      isThirdParty,
      inputImageData,
      inputImageName,
      inputImageType,
      // 创意库信息
      creativeTemplateId: creativeInfo?.templateId,
      creativeTemplateType: creativeInfo?.templateType || 'none',
      bpInputs: creativeInfo?.bpInputs,
      smartPlusOverrides: creativeInfo?.smartPlusOverrides
    };
    try {
      if (currentUser) {
        // 登录状态，使用后端API
        const { id, ...historyWithoutId } = historyItem;
        const result = await historyApi.createHistory(historyWithoutId as any);
        if (result.success && result.data) {
          setGenerationHistory(prev => [result.data!, ...prev].slice(0, 50));
          return result.data.id; // 返回后端生成的ID
        }
      } else {
        // 未登录，使用本地IndexedDB
        await saveHistoryToDB(historyItem);
        setGenerationHistory(prev => [historyItem, ...prev].slice(0, 50));
        return historyId; // 返回本地生成的ID
      }
    } catch (e) {
      console.error("Failed to save history:", e);
    }
    return undefined;
  };
  
  const downloadImage = useCallback(async (url: string, filename?: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const downloadFilename = filename || `ai-generated-${timestamp}.png`;
    
    // 如果是 base64 数据或同源URL，直接下载
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    // 对于外部URL，尝试使用fetch获取blob后下载
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // 如果fetch失败（CORS等问题），在新窗口打开
      console.error('下载失败，尝试在新窗口打开:', e);
      window.open(url, '_blank');
    }
  }, []);

  const handleExportIdeas = () => {
    if (creativeIdeas.length === 0) {
        alert("库是空的 / Library is empty.");
        return;
    }
    const dataStr = JSON.stringify(creativeIdeas, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'creative_library.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleImportIdeas = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const content = e.target?.result;
              if (typeof content !== 'string') throw new Error("File content is not a string.");
              const ideas = JSON.parse(content);

              if (Array.isArray(ideas) && ideas.every(idea => 'id' in idea && 'title' in idea && 'prompt' in idea && 'imageUrl' in idea)) {
                  if (currentUser) {
                    // 登录状态，使用后端API
                    const ideasWithoutId = ideas.map(({ id, ...rest }) => rest);
                    const result = await creativeIdeasApi.importCreativeIdeas(ideasWithoutId as any);
                    if (result.success) {
                      await loadDataFromBackend();
                      alert(`已导入 ${ideas.length} 个创意!`);
                    } else {
                      throw new Error(result.error || '导入失败');
                    }
                  } else {
                    // 未登录，使用本地IndexedDB
                    await importToDB(ideas as CreativeIdea[]);
                    const allIdeas = await getAllFromDB();
                    allIdeas.sort((a, b) => (b.order || 0) - (a.order || 0));
                    setCreativeIdeas(allIdeas);
                    alert(`已导入 ${ideas.length} 个创意!`);
                  }
              } else {
                  throw new Error("文件格式无效");
              }
          } catch (error) {
              console.error("Failed to import creative ideas:", error);
              alert("导入失败");
          } finally {
              if (event.target) {
                  event.target.value = '';
              }
          }
      };
      reader.readAsText(file);
  };
  
  const handleSaveCreativeIdea = async (idea: Partial<CreativeIdea>) => {
    console.log('[handleSaveCreativeIdea] 接收到数据:', {
      id: idea.id,
      suggestedAspectRatio: idea.suggestedAspectRatio,
      suggestedResolution: idea.suggestedResolution
    });
    
    try {
      if (currentUser) {
        // 登录状态，使用后端API
        if (idea.id) {
          // 更新现有创意
          const result = await creativeIdeasApi.updateCreativeIdea(idea.id, idea);
          if (!result.success) {
            throw new Error(result.error || '更新失败');
          }
        } else {
          // 创建新创意
          const newOrder = creativeIdeas.length > 0 ? Math.max(...creativeIdeas.map(i => i.order || 0)) + 1 : 1;
          const { id, ...ideaWithoutId } = idea as any;
          const result = await creativeIdeasApi.createCreativeIdea({ ...ideaWithoutId, order: newOrder });
          if (!result.success) {
            throw new Error(result.error || '创建失败');
          }
        }
        // 重新加载数据
        await loadDataFromBackend();
      } else {
        // 未登录，使用本地IndexedDB
        let ideaToSave: CreativeIdea;
        if (idea.id) {
          const existingIdea = creativeIdeas.find(i => i.id === idea.id);
          ideaToSave = { ...existingIdea, ...idea, id: idea.id } as CreativeIdea;
        } else {
          const newOrder = creativeIdeas.length > 0 ? Math.max(...creativeIdeas.map(i => i.order || 0)) + 1 : 1;
          ideaToSave = { ...idea, id: Date.now(), order: newOrder } as CreativeIdea;
        }
        
        console.log('[handleSaveCreativeIdea] 保存到IndexedDB:', {
          suggestedAspectRatio: ideaToSave.suggestedAspectRatio,
          suggestedResolution: ideaToSave.suggestedResolution
        });
        
        await saveToDB(ideaToSave);
        const updatedIdeas = await getAllFromDB();
        updatedIdeas.sort((a, b) => (b.order || 0) - (a.order || 0));
        
        console.log('[handleSaveCreativeIdea] 从 IndexedDB 读取后:', 
          updatedIdeas.map(i => ({ id: i.id, ratio: i.suggestedAspectRatio, res: i.suggestedResolution }))
        );
        
        setCreativeIdeas(updatedIdeas);
      }

      setAddIdeaModalOpen(false);
      setEditingIdea(null);
    } catch (e) {
      console.error("Failed to save creative idea:", e);
      alert(`保存失败: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDeleteCreativeIdea = async (id: number) => {
    try {
      if (currentUser) {
        // 登录状态，使用后端API
        const result = await creativeIdeasApi.deleteCreativeIdea(id);
        if (!result.success) {
          throw new Error(result.error || '删除失败');
        }
        await loadDataFromBackend();
      } else {
        // 未登录，使用本地IndexedDB
        await deleteFromDB(id);
        const updatedIdeas = await getAllFromDB();
        updatedIdeas.sort((a, b) => (b.order || 0) - (a.order || 0));
        setCreativeIdeas(updatedIdeas);
      }
    } catch (e) {
      console.error("Failed to delete creative idea:", e);
      alert(`删除失败: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };
  
  const handleStartEditIdea = (idea: CreativeIdea) => {
    setEditingIdea(idea);
    setAddIdeaModalOpen(true);
  };

  const handleAddNewIdea = () => {
    setEditingIdea(null);
    setAddIdeaModalOpen(true);
  };

  const handleReorderIdeas = async (reorderedIdeas: CreativeIdea[]) => {
    try {
        const ideasToUpdate = reorderedIdeas.map((idea, index) => ({
            ...idea,
            order: reorderedIdeas.length - index,
        }));
        setCreativeIdeas(ideasToUpdate);
        
        if (currentUser) {
          // 登录状态，使用后端API
          const orderedIds = ideasToUpdate.map(i => i.id);
          await creativeIdeasApi.reorderCreativeIdeas(orderedIds);
        } else {
          // 未登录，使用本地IndexedDB
          await Promise.all(ideasToUpdate.map(idea => saveToDB(idea)));
        }
    } catch (e) {
        console.error("Failed to reorder ideas:", e);
    }
  };


  const handleUseCreativeIdea = (idea: CreativeIdea) => {
    setActiveSmartTemplate(null);
    setActiveSmartPlusTemplate(null);
    setActiveBPTemplate(null);
    
    // 保存当前使用的创意库（用于扣费）
    setActiveCreativeIdea(idea);
    
    // 应用创意库建议的宽高比和分辨率
    if (idea.suggestedAspectRatio) {
      setAspectRatio(idea.suggestedAspectRatio);
    }
    if (idea.suggestedResolution) {
      setImageSize(idea.suggestedResolution);
    }
    
    // Reset BP
    setBpInputs({});

    if (idea.isBP) {
        setActiveBPTemplate(idea);
        setPrompt(''); // BP starts empty, waits for generation/fill
        
        // Initialize inputs for 'input' type fields
        if (idea.bpFields) {
            const initialInputs: Record<string, string> = {};
            idea.bpFields.forEach(v => {
                if (v.type === 'input') {
                    initialInputs[v.id] = '';
                }
            });
            setBpInputs(initialInputs);
        } else if (idea.bpVariables) { 
            // Migration fallback
            const initialInputs: Record<string, string> = {};
            idea.bpVariables.forEach(v => initialInputs[v.id] = '');
            setBpInputs(initialInputs);
        }
    } else if (idea.isSmart) {
      setActiveSmartTemplate(idea);
      setPrompt(''); // Clear prompt for keyword
    } else if (idea.isSmartPlus) {
        setActiveSmartPlusTemplate(idea);
        setSmartPlusOverrides(idea.smartPlusConfig || JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
        setPrompt(''); // Clear prompt for keywords
    } else {
      setPrompt(idea.prompt);
    }
    setView('editor');
  };

  const activeFile = activeFileIndex !== null ? files[activeFileIndex] : null;

  const handleGenerateSmartPrompt = useCallback(async () => {
    const activeTemplate = activeSmartTemplate || activeSmartPlusTemplate || activeBPTemplate;
     if (!activeTemplate) {
      alert('请先从创意库选择一个模板');
      return;
    }

    // 检查API配置：要么有Gemini Key，要么启用了贞贞API
    const hasValidApi = apiKey || (thirdPartyApiConfig.enabled && thirdPartyApiConfig.apiKey);

    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);
    
    setSmartPromptGenStatus(ApiStatus.Loading);
    setError(null);

    try {
      if (activeBPTemplate) {
          // BP Mode Logic (New Orchestration)
          if (!hasValidApi) {
             alert('BP 模式运行智能体需要配置 API Key（Gemini 或贞贞API）');
             setSmartPromptGenStatus(ApiStatus.Idle);
             return;
          }
          // BP模式支持有图片或无图片，传递 activeFile（可能为 null）
          const finalPrompt = await processBPTemplate(activeFile, activeBPTemplate, bpInputs);
          setPrompt(finalPrompt);

      } else {
          // Standard/Smart Logic (Legacy)
          if (!hasValidApi) {
             alert('智能提示词生成需要配置 API Key（Gemini 或贞贞API）');
             setSmartPromptGenStatus(ApiStatus.Idle);
             return;
          }
          if (!activeFile) {
            alert('请先上传并选择一张图片');
            setSmartPromptGenStatus(ApiStatus.Idle);
            return;
          }
          if (activeSmartTemplate && !prompt.trim()) {
            alert('请输入关键词');
            setSmartPromptGenStatus(ApiStatus.Idle);
            return;
          }
          const newPromptText = await generateCreativePromptFromImage({
              file: activeFile,
              idea: activeTemplate,
              keyword: prompt, 
              smartPlusConfig: activeTemplate.isSmartPlus ? smartPlusOverrides : undefined,
          });
          setPrompt(newPromptText); 
      }
      
      setSmartPromptGenStatus(ApiStatus.Success);
      setAbortController(null); // 清除控制器

    } catch (e: unknown) {
      // 检查是否是用户主动取消
      if (e instanceof Error && e.name === 'AbortError') {
        console.log('BP处理已被用户取消');
        setSmartPromptGenStatus(ApiStatus.Idle);
        setAbortController(null); // 清除控制器
        return;
      }
      
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error(errorMessage);
      alert(`智能提示词生成失败: ${errorMessage}`);
      setSmartPromptGenStatus(ApiStatus.Error);
      setAbortController(null); // 清除控制器
    }
  }, [activeFile, prompt, apiKey, thirdPartyApiConfig, activeSmartTemplate, activeSmartPlusTemplate, activeBPTemplate, smartPlusOverrides, bpInputs, abortController]);
  
    // 安全保存桌面项目到 localStorage（移除大型 base64 数据）
    const safeDesktopSave = useCallback((items: DesktopItem[]) => {
      try {
        // 保存前移除 base64 imageUrl 以节省空间（有 historyId 可恢复）
        const itemsForStorage = items.map(item => {
          if (item.type === 'image') {
            const imageItem = item as DesktopImageItem;
            // 如果 imageUrl 是 base64 且有 historyId，则不存储 imageUrl
            if (imageItem.imageUrl?.startsWith('data:') && imageItem.historyId) {
              const { imageUrl, ...rest } = imageItem;
              return { ...rest, imageUrl: '' }; // 留空标记，加载时从历史恢复
            }
          }
          return item;
        });
        localStorage.setItem('desktop_items', JSON.stringify(itemsForStorage));
      } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          console.warn('Desktop storage quota exceeded, clearing oldest items...');
          // 配额超出时，尝试只保留最新的20个项目
          const recentItems = items.slice(-20);
          try {
            const itemsForStorage = recentItems.map(item => {
              if (item.type === 'image') {
                const { imageUrl, ...rest } = item as DesktopImageItem;
                return { ...rest, imageUrl: '' };
              }
              return item;
            });
            localStorage.setItem('desktop_items', JSON.stringify(itemsForStorage));
          } catch {
            console.error('Failed to save desktop items even after cleanup');
          }
        } else {
          console.error('Failed to save desktop items:', e);
        }
      }
    }, []);

    // 桌面操作处理
    const handleDesktopItemsChange = useCallback((items: DesktopItem[]) => {
      setDesktopItems(items);
      safeDesktopSave(items);
    }, [safeDesktopSave]);
  
    // 查找桌面空闲位置
    const findNextFreePosition = useCallback((): { x: number, y: number } => {
      const gridSize = 100;
      const maxCols = 10; // 每行最多10个
      const occupiedPositions = new Set(
        desktopItems
          .filter(item => {
            // 只考虑不在文件夹内的项目
            const isInFolder = desktopItems.some(
              other => other.type === 'folder' && (other as DesktopFolderItem).itemIds.includes(item.id)
            );
            return !isInFolder;
          })
          .map(item => `${Math.round(item.position.x / gridSize)},${Math.round(item.position.y / gridSize)}`)
      );
      
      // 从左上角开始找空位
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < maxCols; x++) {
          const key = `${x},${y}`;
          if (!occupiedPositions.has(key)) {
            return { x: x * gridSize, y: y * gridSize };
          }
        }
      }
      return { x: 0, y: 0 };
    }, [desktopItems]);
  
    const handleAddToDesktop = useCallback((item: DesktopImageItem) => {
      // 添加图片到桌面 - 使用函数式更新确保使用最新状态
      setDesktopItems(prevItems => {
        // 在最新状态上查找空闲位置
        const gridSize = 100;
        const maxCols = 8; // 固定8列
        
        // 位置从0开始（渲染时会自动加上居中偏移）
        const occupiedPositions = new Set(
          prevItems
            .filter(existingItem => {
              const isInFolder = prevItems.some(
                other => other.type === 'folder' && (other as DesktopFolderItem).itemIds.includes(existingItem.id)
              );
              return !isInFolder;
            })
            .map(existingItem => `${Math.round(existingItem.position.x / gridSize)},${Math.round(existingItem.position.y / gridSize)}`)
        );
        
        // 从第0列、第0行开始找空位
        let freePos = { x: 0, y: 0 };
        for (let y = 0; y < 100; y++) {
          for (let x = 0; x < maxCols; x++) {
            const key = `${x},${y}`;
            if (!occupiedPositions.has(key)) {
              freePos = { x: x * gridSize, y: y * gridSize };
              break;
            }
          }
          // 检查是否已找到空位
          const foundKey = `${Math.round(freePos.x / gridSize)},${Math.round(freePos.y / gridSize)}`;
          if (!occupiedPositions.has(foundKey)) break;
        }
        
        // 更新项目位置
        const itemWithPosition = { ...item, position: freePos };
        const newItems = [...prevItems, itemWithPosition];
        // 延迟保存到 localStorage（使用 safeDesktopSave 避免配额超限）
        setTimeout(() => {
          try {
            const itemsForStorage = newItems.map(itm => {
              if (itm.type === 'image') {
                const imageItem = itm as DesktopImageItem;
                if (imageItem.imageUrl?.startsWith('data:') && imageItem.historyId) {
                  const { imageUrl, ...rest } = imageItem;
                  return { ...rest, imageUrl: '' };
                }
              }
              return itm;
            });
            localStorage.setItem('desktop_items', JSON.stringify(itemsForStorage));
          } catch (e) {
            console.warn('Desktop storage failed, items kept in memory only:', e);
          }
        }, 0);
        return newItems;
      });
    }, []);

  const handleGenerateClick = useCallback(async () => {
    // 检查API配置
    // 优先级：
    // 1. 已登录 + 启用贞贞API → 使用云端（不需要本地key）
    // 2. 未登录 + 启用贞贞API + 有本地key → 使用本地贞贞
    // 3. 有 Gemini key → 使用本地Gemini
    // 4. 都没有 → 提示配置
    const isCloud = isLoggedIn();
    const hasValidApi = 
      (isCloud && thirdPartyApiConfig.enabled) ||  // 云端模式
      (!isCloud && thirdPartyApiConfig.enabled && thirdPartyApiConfig.apiKey) ||  // 本地第三方
      apiKey;  // 本地Gemini
    
    if (!hasValidApi) {
      if (isCloud) {
        setError('请在设置中启用云端服务');
      } else {
        setError('请先配置 API Key（贞贞API 或 Gemini）或登录使用云服务');
      }
      setStatus(ApiStatus.Error);
      return;
    }
    
    // 获取当前模板的权限设置
    const activeTemplate = activeBPTemplate || activeSmartPlusTemplate || activeSmartTemplate;
    const canViewPrompt = activeTemplate?.allowViewPrompt !== false;
    
    let finalPrompt = prompt;
    
    // 如果不允许查看提示词，需要先自动生成提示词
    if (!canViewPrompt && activeTemplate) {
      setStatus(ApiStatus.Loading);
      setError(null);
      
      try {
        console.log('[Generate] 不允许查看提示词，自动生成中...');
        
        if (activeBPTemplate) {
          // BP 模式
          const activeFile = files.length > 0 ? files[0] : null;
          finalPrompt = await processBPTemplate(activeFile, activeBPTemplate, bpInputs);
        } else if (activeSmartPlusTemplate || activeSmartTemplate) {
          // Smart/Smart+ 模式
          const activeFile = files.length > 0 ? files[0] : null;
          if (!activeFile) {
            setError('Smart/Smart+模式需要上传图片');
            setStatus(ApiStatus.Error);
            return;
          }
          finalPrompt = await generateCreativePromptFromImage({
            file: activeFile,
            idea: activeTemplate,
            keyword: prompt,
            smartPlusConfig: activeTemplate.isSmartPlus ? smartPlusOverrides : undefined,
          });
        }
        
        console.log('[Generate] 提示词已生成，开始生图');
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : '提示词生成失败';
        console.error('[Generate] 提示词生成失败');
        setError(`生成失败: ${errorMessage}`);
        setStatus(ApiStatus.Error);
        return;
      }
    } else {
      // 允许查看提示词的正常流程
      if (!prompt) {
        setError('请输入提示词');
        setStatus(ApiStatus.Error);
        return;
      }
      
      // Ensure prompt is generated if template is active but prompt box is empty
      if ((activeSmartTemplate || activeSmartPlusTemplate || activeBPTemplate) && !prompt.trim()) {
           setError(`请先点击企鹅按钮生成/填入提示词`);
           setStatus(ApiStatus.Error);
           return;
      }
    }
    
    setStatus(ApiStatus.Loading);
    setError(null);
    setGeneratedContent(null);

    try {
      // 获取当前创意库的扣费金额（优先用 activeCreativeIdea，它保存了所有类型的创意库）
      const creativeIdeaCost = activeCreativeIdea?.cost;
      
      // 传递所有上传的文件（支持多图编辑），使用 finalPrompt
      const result = await editImageWithGemini(files, finalPrompt, { aspectRatio, imageSize }, creativeIdeaCost);
      // 保存生成时使用的所有原始图片，用于重新生成
      setGeneratedContent({ ...result, originalFiles: [...files] });
      setStatus(ApiStatus.Success);
      
      // 日志输出 - 不打印提示词内容
      console.log('[Generate] 生成成功');
      
      // 保存到历史记录（包含原始输入图片和创意库信息）
      // 如果不允许查看提示词，保存时用占位文本
      const promptToSave = canViewPrompt ? finalPrompt : '[加密提示词]';
      
      // 加密场景下的命名规则：创意库标题 + 关键词
      let promptForDesktop = finalPrompt;
      if (!canViewPrompt && activeTemplate) {
        // 获取创意库标题
        const templateTitle = activeTemplate.title || '创意库';
        // 获取关键词：BP模式用bpInputs的第一个输入，Smart/Smart+模式用prompt
        let keyword = '';
        if (activeBPTemplate && bpInputs) {
          // BP模式：取所有用户输入的第一个非空值
          const inputValues = Object.values(bpInputs as Record<string, string>).filter(v => v && v.trim());
          keyword = inputValues[0] || '';
        } else {
          // Smart/Smart+模式：用用户输入的关键词
          keyword = prompt.trim();
        }
        // 组合命名
        promptForDesktop = keyword ? `${templateTitle}·${keyword}` : templateTitle;
      }
      if (result.imageUrl) {
        // 确定当前使用的创意库类型
        let templateType: 'smart' | 'smartPlus' | 'bp' | 'none' = 'none';
        let templateId: number | undefined;
        if (activeBPTemplate) {
          templateType = 'bp';
          templateId = activeBPTemplate.id;
        } else if (activeSmartPlusTemplate) {
          templateType = 'smartPlus';
          templateId = activeSmartPlusTemplate.id;
        } else if (activeSmartTemplate) {
          templateType = 'smart';
          templateId = activeSmartTemplate.id;
        }
        
        await saveToHistory(result.imageUrl, promptToSave, thirdPartyApiConfig.enabled, files.length > 0 ? files[0] : null, {
          templateId,
          templateType,
          bpInputs: templateType === 'bp' ? { ...bpInputs } : undefined,
          smartPlusOverrides: templateType === 'smartPlus' ? [...smartPlusOverrides] : undefined
        }).then(savedHistoryId => {
          // 自动添加到桌面，并关联历史记录ID
          const freePos = findNextFreePosition();
          const desktopItem: DesktopImageItem = {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            type: 'image',
            name: promptForDesktop.slice(0, 15) + (promptForDesktop.length > 15 ? '...' : ''),
            position: freePos,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            imageUrl: result.imageUrl!,
            prompt: promptToSave,
            model: thirdPartyApiConfig.enabled ? 'nano-banana-2' : 'Gemini',
            isThirdParty: thirdPartyApiConfig.enabled,
            historyId: savedHistoryId, // 关联历史记录，用于重新生成时恢复原始输入图片
          };
          handleAddToDesktop(desktopItem);
        });
      }
      
      if (autoSave && result.imageUrl) {
        downloadImage(result.imageUrl);
      }
      
      // 生成成功后实时更新用户余额
      if (result.coinsRemaining !== undefined && currentUser) {
        setCurrentUser({ ...currentUser, coins: result.coinsRemaining });
      }
    } catch (e: unknown) {
      // 检查是否为余额不足错误（402状态码）
      let errorMessage = 'An unknown error occurred.';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      // 如果是来自后端的余额不足提示，直接显示趣味文案
      if (errorMessage.includes('🐧') || errorMessage.includes('Pebbling') || errorMessage.includes('鹅卵石') || errorMessage.includes('余额')) {
        setError(errorMessage);
      } else {
        setError(`生成失败: ${errorMessage}`);
      }
      console.error('[Generate] 生成失败');
      setStatus(ApiStatus.Error);
    }
  }, [files, prompt, apiKey, thirdPartyApiConfig, activeSmartTemplate, activeSmartPlusTemplate, activeBPTemplate, autoSave, downloadImage, aspectRatio, imageSize, currentUser, activeCreativeIdea, findNextFreePosition, handleAddToDesktop, bpInputs, smartPlusOverrides]);

  // 卸载创意库：清空所有模板设置
  const handleClearTemplate = useCallback(() => {
    setActiveSmartTemplate(null);
    setActiveSmartPlusTemplate(null);
    setActiveBPTemplate(null);
    setActiveCreativeIdea(null);
    setBpInputs({});
    setSmartPlusOverrides(JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleGenerateClick();
      }
      // Esc 键卸载创意库
      if (event.key === 'Escape') {
        const hasActiveTemplate = activeSmartTemplate || activeSmartPlusTemplate || activeBPTemplate;
        if (hasActiveTemplate) {
          event.preventDefault();
          handleClearTemplate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleGenerateClick, activeSmartTemplate, activeSmartPlusTemplate, activeBPTemplate, handleClearTemplate]);

  // 修改canGenerate条件
  // 如果不允许查看提示词，则只要有模板就可以生成
  const activeTemplateForCheck = activeBPTemplate || activeSmartPlusTemplate || activeSmartTemplate;
  const canViewPromptForCheck = activeTemplateForCheck?.allowViewPrompt !== false;
  const canGenerate = (canViewPromptForCheck ? prompt.trim().length > 0 : !!activeTemplateForCheck) && status !== ApiStatus.Loading;
  
  const isSmartReady = !!activeSmartTemplate && prompt.trim().length > 0;
  const isSmartPlusReady = !!activeSmartPlusTemplate;
  const isBPReady = !!activeBPTemplate; // BP is ready to click penguin anytime to fill variables
  
  const canGenerateSmartPrompt = ((files.length > 0) && (isSmartReady || isSmartPlusReady)) || (isBPReady) && smartPromptGenStatus !== ApiStatus.Loading;

  const handleBpInputChange = (id: string, value: string) => {
      setBpInputs(prev => ({...prev, [id]: value}));
  };
  
  // 再次编辑：将生成的图片转换为File，清空其他图片，卸载创意库
  const handleEditAgain = useCallback(async () => {
    if (!generatedContent?.imageUrl) return;
    
    try {
      let blob: Blob;
      
      if (generatedContent.imageUrl.startsWith('data:')) {
        // base64 转 Blob
        const response = await fetch(generatedContent.imageUrl);
        blob = await response.blob();
      } else {
        // 外部URL，fetch获取
        const response = await fetch(generatedContent.imageUrl);
        blob = await response.blob();
      }
      
      // 创建 File 对象
      const timestamp = Date.now();
      const file = new File([blob], `generated-${timestamp}.png`, { type: 'image/png' });
      
      // 清空所有图片，仅保留结果图并选中
      setFiles([file]);
      setActiveFileIndex(0);
      
      // 清空创意库，还原默认状态
      setActiveSmartTemplate(null);
      setActiveSmartPlusTemplate(null);
      setActiveBPTemplate(null);
      setActiveCreativeIdea(null);
      setBpInputs({});
      setSmartPlusOverrides(JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
      setPrompt(''); // 清空提示词
      
      // 清除当前生成结果，准备再次编辑
      setGeneratedContent(null);
      setStatus(ApiStatus.Idle);
    } catch (e) {
      console.error('转换图片失败:', e);
      setError('无法将图片添加到编辑列表');
    }
  }, [generatedContent]);
  
  // 重新生成：恢复原始输入状态，等待用户手动点击生成
  const handleRegenerate = useCallback(() => {
    // 保存当初使用的所有原始图片
    const originalFiles = generatedContent?.originalFiles || [];
    
    // 恢复原始输入图片到 UI 上
    if (originalFiles.length > 0) {
      setFiles(originalFiles);
      setActiveFileIndex(0);
    } else {
      setFiles([]);
      setActiveFileIndex(null);
    }
    
    // 关闭结果浮层，回到编辑状态
    setStatus(ApiStatus.Idle);
    setGeneratedContent(null);
    setError(null);
    
    // 提示已恢复 - 保留 prompt 不变，用户可以手动点生成
  }, [generatedContent]);

  const handleDesktopImageDoubleClick = useCallback((item: DesktopImageItem) => {
    // 双击图片预览
    setPreviewImageUrl(item.imageUrl);
  }, []);

  // 关闭生成结果浮层
  const handleDismissResult = useCallback(() => {
    setStatus(ApiStatus.Idle);
    setGeneratedContent(null);
    setError(null);
  }, []);

  const handleRenameItem = useCallback((id: string, newName: string) => {
    const updatedItems = desktopItems.map(item => {
      if (item.id === id) {
        return { ...item, name: newName, updatedAt: Date.now() };
      }
      return item;
    });
    handleDesktopItemsChange(updatedItems);
  }, [desktopItems, handleDesktopItemsChange]);

  // 桌面图片操作 - 预览
  const handleDesktopImagePreview = useCallback((item: DesktopImageItem) => {
    setPreviewImageUrl(item.imageUrl);
  }, []);

  // 桌面图片操作 - 再编辑（将图片添加到上传列表并设置提示词）
  const handleDesktopImageEditAgain = useCallback(async (item: DesktopImageItem) => {
    try {
      // 将图片URL转换为File对象
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${item.name}.png`, { type: 'image/png' });
      
      // 添加到文件列表
      setFiles(prev => [...prev, file]);
      setActiveFileIndex(files.length); // 选中新添加的图片
      
      // 设置提示词
      if (item.prompt) {
        setPrompt(item.prompt);
      }
    } catch (e) {
      console.error('添加图片到编辑列表失败:', e);
    }
  }, [files.length]);

  // 桌面图片操作 - 重新生成（只恢复状态，不自动生成）
  const handleDesktopImageRegenerate = useCallback(async (item: DesktopImageItem) => {
    if (!item.prompt) {
      setError('此图片没有保存原始提示词，无法重新生成');
      setStatus(ApiStatus.Error);
      return;
    }
    
    // 恢复提示词
    setPrompt(item.prompt);
    
    // 尝试恢复原始输入图片和创意库配置（如果有历史记录）
    if (item.historyId) {
      const historyItem = generationHistory.find(h => h.id === item.historyId);
      if (historyItem) {
        // 恢复输入图片
        if (historyItem.inputImageData && historyItem.inputImageType) {
          try {
            const byteCharacters = atob(historyItem.inputImageData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: historyItem.inputImageType });
            const restoredFile = new File([blob], historyItem.inputImageName || 'restored-input.png', { type: historyItem.inputImageType });
            
            setFiles([restoredFile]);
            setActiveFileIndex(0);
          } catch (e) {
            console.warn('恢复输入图片失败:', e);
            setFiles([]);
            setActiveFileIndex(null);
          }
        } else {
          // 没有输入图片
          setFiles([]);
          setActiveFileIndex(null);
        }
        
        // 恢复创意库配置
        setActiveSmartTemplate(null);
        setActiveSmartPlusTemplate(null);
        setActiveBPTemplate(null);
        setActiveCreativeIdea(null);
        setBpInputs({});
        setSmartPlusOverrides(JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
        
        if (historyItem.creativeTemplateType && historyItem.creativeTemplateType !== 'none' && historyItem.creativeTemplateId) {
          const template = creativeIdeas.find(idea => idea.id === historyItem.creativeTemplateId);
          if (template) {
            // 设置当前使用的创意库（用于扣费）
            setActiveCreativeIdea(template);
            
            if (historyItem.creativeTemplateType === 'bp') {
              setActiveBPTemplate(template);
              if (historyItem.bpInputs) {
                setBpInputs(historyItem.bpInputs);
              }
            } else if (historyItem.creativeTemplateType === 'smartPlus') {
              setActiveSmartPlusTemplate(template);
              if (historyItem.smartPlusOverrides) {
                setSmartPlusOverrides(historyItem.smartPlusOverrides);
              }
            } else if (historyItem.creativeTemplateType === 'smart') {
              setActiveSmartTemplate(template);
            }
          }
        }
      } else {
        // 找不到历史记录，清空输入
        setFiles([]);
        setActiveFileIndex(null);
      }
    } else {
      // 没有历史记录，清空输入
      setFiles([]);
      setActiveFileIndex(null);
    }
    
    // 关闭结果浮层，回到编辑状态
    setStatus(ApiStatus.Idle);
    setGeneratedContent(null);
    setError(null);
    
    // 取消桌面选中，让用户注意力回到编辑区
    setDesktopSelectedIds([]);
  }, [generationHistory, creativeIdeas]);

  // 加载桌面数据（并从历史记录恢复空的 imageUrl）
  useEffect(() => {
    const savedDesktopItems = localStorage.getItem('desktop_items');
    if (savedDesktopItems) {
      try {
        const items = JSON.parse(savedDesktopItems) as DesktopItem[];
        // 从历史记录中恢复空的 imageUrl
        const restoredItems = items.map(item => {
          if (item.type === 'image') {
            const imageItem = item as DesktopImageItem;
            if (!imageItem.imageUrl && imageItem.historyId) {
              // 查找历史记录中的图片
              const historyEntry = generationHistory.find(h => h.id === imageItem.historyId);
              if (historyEntry?.imageUrl) {
                return { ...imageItem, imageUrl: historyEntry.imageUrl };
              }
            }
          }
          return item;
        });
        setDesktopItems(restoredItems);
      } catch (e) {
        console.error('Failed to load desktop items:', e);
      }
    }
  }, [generationHistory]);

  return (
    <div className="h-screen bg-gray-950 text-gray-100 font-sans flex flex-row overflow-hidden selection:bg-indigo-500/30">
      {/* 雪花效果 */}
      <SnowfallEffect />
      
      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
        multiple
      />
      <input
        ref={importIdeasInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportIdeas}
      />
      
      {/* 左侧面板 */}
      <div className="flex-shrink-0">
        <LeftPanel 
            files={files}
            activeFileIndex={activeFileIndex}
            onFileSelection={handleFileSelection}
            onFileRemove={handleFileRemove}
            onFileSelect={setActiveFileIndex}
            onTriggerUpload={() => fileInputRef.current?.click()}
            currentUser={currentUser}
            onLoginClick={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
            onRechargeClick={() => setRechargeModalOpen(true)}
            onSettingsClick={() => setSettingsModalOpen(true)}
            currentApiMode={
              thirdPartyApiConfig.enabled && thirdPartyApiConfig.apiKey && thirdPartyApiConfig.baseUrl
                ? 'local-thirdparty'
                : !thirdPartyApiConfig.enabled && apiKey
                  ? 'local-gemini'
                  : currentUser && thirdPartyApiConfig.enabled
                    ? 'cloud'
                    : currentUser
                      ? 'cloud'
                      : 'local-gemini'
            }
            prompt={prompt}
            setPrompt={handleSetPrompt}
            activeSmartTemplate={activeSmartTemplate}
            activeSmartPlusTemplate={activeSmartPlusTemplate}
            activeBPTemplate={activeBPTemplate}
            bpInputs={bpInputs}
            setBpInput={handleBpInputChange}
            smartPlusOverrides={smartPlusOverrides}
            setSmartPlusOverrides={setSmartPlusOverrides}
            handleGenerateSmartPrompt={handleGenerateSmartPrompt}
            canGenerateSmartPrompt={canGenerateSmartPrompt}
            smartPromptGenStatus={smartPromptGenStatus}
            onCancelSmartPrompt={handleCancelSmartPrompt}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            imageSize={imageSize}
            setImageSize={setImageSize}
            isThirdPartyApiEnabled={thirdPartyApiConfig.enabled}
            onClearTemplate={handleClearTemplate}
          />
        </div>
      <div className="relative flex-1 flex min-w-0">
        <Canvas 
          view={view}
          setView={setView}
          files={files}
          onUploadClick={() => fileInputRef.current?.click()}
          creativeIdeas={creativeIdeas}
          onBack={() => setView('editor')}
          onAdd={handleAddNewIdea}
          onDelete={handleDeleteCreativeIdea}
          onEdit={handleStartEditIdea}
          onUse={handleUseCreativeIdea}
          status={status}
          error={error}
          content={generatedContent}
          onPreviewClick={setPreviewImageUrl}
          onExportIdeas={handleExportIdeas}
          onImportIdeas={() => importIdeasInputRef.current?.click()}
          onReorderIdeas={handleReorderIdeas}
          onEditAgain={handleEditAgain}
          onRegenerate={handleRegenerate}
          onDismissResult={handleDismissResult}
          prompt={prompt}
          imageSize={imageSize}
          history={generationHistory}
          onHistorySelect={handleHistorySelect}
          onHistoryDelete={handleHistoryDelete}
          onHistoryClear={handleHistoryClear}
          desktopItems={desktopItems}
          onDesktopItemsChange={handleDesktopItemsChange}
          onDesktopImageDoubleClick={handleDesktopImageDoubleClick}
          desktopSelectedIds={desktopSelectedIds}
          onDesktopSelectionChange={setDesktopSelectedIds}
          openFolderId={openFolderId}
          onFolderOpen={setOpenFolderId}
          onFolderClose={() => setOpenFolderId(null)}
          openStackId={openStackId}
          onStackOpen={setOpenStackId}
          onStackClose={() => setOpenStackId(null)}
          onRenameItem={handleRenameItem}
          onDesktopImagePreview={handleDesktopImagePreview}
          onDesktopImageEditAgain={handleDesktopImageEditAgain}
          onDesktopImageRegenerate={handleDesktopImageRegenerate}
        />
        {view === 'editor' && (
             <div className="absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-300 bottom-6">
                <GenerateButton 
                    onClick={handleGenerateClick}
                    disabled={!canGenerate}
                    status={status}
                />
             </div>
        )}
      </div>
      {/* 右侧面板 */}
      <div className="flex-shrink-0">
        <RightPanel 
          creativeIdeas={creativeIdeas}
          handleUseCreativeIdea={handleUseCreativeIdea}
          setAddIdeaModalOpen={() => setAddIdeaModalOpen(true)}
          setView={setView}
          onDeleteIdea={handleDeleteCreativeIdea}
          onEditIdea={handleStartEditIdea}
        />
      </div>
      
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.2); }
      `}</style>
      
      {previewImageUrl && (
        <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
      )}
      <AddCreativeIdeaModal 
        isOpen={isAddIdeaModalOpen}
        onClose={() => { setAddIdeaModalOpen(false); setEditingIdea(null); }}
        onSave={handleSaveCreativeIdea}
        ideaToEdit={editingIdea}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      <RechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
        currentBalance={currentUser?.coins || 0}
        onRechargeSuccess={(newBalance) => {
          if (currentUser) {
            setCurrentUser({ ...currentUser, coins: newBalance });
          }
        }}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        isLoggedIn={!!currentUser}
        onLoginClick={() => {
          setSettingsModalOpen(false);
          setAuthModalOpen(true);
        }}
        thirdPartyConfig={thirdPartyApiConfig}
        onThirdPartyConfigChange={handleThirdPartyConfigChange}
        geminiApiKey={apiKey}
        onGeminiApiKeySave={handleApiKeySave}
        autoSaveEnabled={autoSave}
        onAutoSaveToggle={handleAutoSaveToggle}
      />
    </div>
  );
};

// 包裹应用的主题Provider
const AppWithTheme: React.FC = () => {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
};

export default AppWithTheme;
