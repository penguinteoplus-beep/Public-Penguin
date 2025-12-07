
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { GeneratedImageDisplay } from './components/GeneratedImageDisplay';
import { editImageWithGemini, generateCreativePromptFromImage, initializeAiClient, processBPTemplate, setThirdPartyConfig } from './services/geminiService';
import { ApiStatus, GeneratedContent, CreativeIdea, SmartPlusConfig, ThirdPartyApiConfig, GenerationHistory } from './types';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ApiKeyManager } from './components/ApiKeyManager';
import { AddCreativeIdeaModal } from './components/AddCreativeIdeaModal';
import { CreativeLibrary } from './components/CreativeLibrary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Accordion } from './components/Accordion';
import { LibraryIcon } from './components/icons/LibraryIcon';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { PlusCircleIcon } from './components/icons/PlusCircleIcon';
import { GenerateButton } from './components/GenerateButton';
import { PenguinIcon } from './components/icons/PenguinIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { LightbulbIcon } from './components/icons/LightbulbIcon';
import { HistoryPanel } from './components/HistoryPanel';
import { ClockIcon } from './components/icons/ClockIcon';


interface LeftPanelProps {
  apiKey: string;
  onApiKeySave: (key: string) => void;
  thirdPartyConfig: ThirdPartyApiConfig;
  onThirdPartyConfigChange: (config: ThirdPartyApiConfig) => void;
  files: File[];
  activeFileIndex: number | null;
  onFileSelection: (files: FileList | null) => void;
  onFileRemove: (index: number) => void;
  onFileSelect: (index: number) => void;
  onTriggerUpload: () => void;
  autoSaveEnabled: boolean;
  onAutoSaveToggle: (enabled: boolean) => void;
  history: GenerationHistory[];
  onHistorySelect: (item: GenerationHistory) => void;
  onHistoryDelete: (id: number) => void;
  onHistoryClear: () => void;
}

interface RightPanelProps {
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
  creativeIdeas: CreativeIdea[];
  handleUseCreativeIdea: (idea: CreativeIdea) => void;
  setAddIdeaModalOpen: (isOpen: boolean) => void;
  setView: (view: 'editor' | 'library') => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  imageSize: string;
  setImageSize: (value: string) => void;
  isThirdPartyApiEnabled: boolean;
}

interface CanvasProps {
  view: 'editor' | 'library';
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
  apiKey,
  onApiKeySave,
  thirdPartyConfig,
  onThirdPartyConfigChange,
  files,
  activeFileIndex,
  onFileSelection,
  onFileRemove,
  onFileSelect,
  onTriggerUpload,
  autoSaveEnabled,
  onAutoSaveToggle,
  history,
  onHistorySelect,
  onHistoryDelete,
  onHistoryClear
}) => (
  <aside className="w-[300px] bg-black/40 backdrop-blur-2xl flex-shrink-0 flex flex-col h-full border-r border-white/10 z-20">
      <div className="p-6 border-b border-white/10 flex-shrink-0">
           <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-500 tracking-tight">
            🐧 艾洛魔法
           </h1>
           <p className="text-[10px] text-gray-400 font-medium tracking-widest mt-1 uppercase">AI Studio Pro</p>
      </div>
      <div className="flex-grow p-4 space-y-4 flex flex-col min-h-0 overflow-hidden">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">资源素材</h2>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
             <ImageUploader 
                files={files}
                activeFileIndex={activeFileIndex}
                onFileChange={onFileSelection}
                onFileRemove={onFileRemove}
                onFileSelect={onFileSelect}
                onTriggerUpload={onTriggerUpload}
                />
        </div>
        
        {/* 历史记录区域 */}
        <div className="flex-shrink-0 border-t border-white/10 pt-4">
          <Accordion icon={<ClockIcon className="w-4 h-4"/>} title="历史生图" isOpen={false}>
            <div className="pt-2">
              <HistoryPanel
                history={history}
                onSelect={onHistorySelect}
                onDelete={onHistoryDelete}
                onClear={onHistoryClear}
              />
            </div>
          </Accordion>
        </div>
      </div>
      <div className="p-4 mt-auto flex-shrink-0 border-t border-white/10">
         <Accordion icon={<SettingsIcon/>} title="设置" isOpen={!apiKey && !thirdPartyConfig.enabled}>
            <div className="flex flex-col gap-4 pt-2">
              <ApiKeyManager 
                apiKey={apiKey} 
                onApiKeySave={onApiKeySave}
                thirdPartyConfig={thirdPartyConfig}
                onThirdPartyConfigChange={onThirdPartyConfigChange}
              />
              
              {/* 当前模型显示 */}
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                <span className="text-xs text-gray-400">当前模型</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  thirdPartyConfig.enabled 
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {thirdPartyConfig.enabled ? thirdPartyConfig.model || 'nano-banana-2' : 'Gemini 3 Pro'}
                </span>
              </div>
              
              <div className="flex items-center justify-between group">
                <label htmlFor="auto-save-toggle" className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors flex items-center gap-2 cursor-pointer">
                  <DownloadIcon className="w-4 h-4" />
                  自动保存
                </label>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="auto-save-toggle" 
                    className="sr-only peer" 
                    checked={autoSaveEnabled} 
                    onChange={(e) => onAutoSaveToggle(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
                </div>
              </div>
            </div>
         </Accordion>
      </div>
  </aside>
);

const SmartPlusDirector: React.FC<{
    config: SmartPlusConfig;
    onConfigChange: (config: SmartPlusConfig) => void;
    templateConfig?: SmartPlusConfig;
}> = ({ config, onConfigChange, templateConfig }) => {
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
        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-1">导演模式</h3>
            {visibleComponents.map(component => (
                <div key={component.id} className="flex items-start gap-3 group">
                    <label className="relative inline-flex items-center cursor-pointer pt-1" htmlFor={`smart-plus-override-${component.id}`}>
                        <input
                            type="checkbox"
                            id={`smart-plus-override-${component.id}`}
                            className="sr-only peer"
                            checked={component.enabled}
                            onChange={(e) => handleConfigChange(component.id, 'enabled', e.target.checked)}
                        />
                         <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500 transition-colors"></div>
                    </label>
                    <div className="flex-grow">
                        <label htmlFor={`smart-plus-override-${component.id}-features`} className="text-xs font-medium text-gray-400 group-hover:text-gray-300 transition-colors mb-1 block">
                            {component.label}
                        </label>
                        <textarea
                            id={`smart-plus-override-${component.id}-features`}
                            value={component.features}
                            onChange={(e) => handleConfigChange(component.id, 'features', e.target.value)}
                            className="w-full text-xs p-2 bg-black/40 border border-white/10 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all text-gray-300 placeholder-gray-600"
                            placeholder={component.enabled ? '描述特征...' : '自动创意'}
                            disabled={!component.enabled}
                            rows={2}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

const BPModePanel: React.FC<{
    template: CreativeIdea;
    inputs: Record<string, string>;
    onInputChange: (id: string, value: string) => void;
}> = ({ template, inputs, onInputChange }) => {
    // Only show manual inputs (type === 'input')
    const manualFields = template.bpFields?.filter(f => f.type === 'input') || [];
    const agentFields = template.bpFields?.filter(f => f.type === 'agent') || [];

    if (manualFields.length === 0 && agentFields.length === 0) return null;

    return (
        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md mb-4">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">BP 模式</h3>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    {agentFields.length > 0 && <span className="flex items-center gap-1"><LightbulbIcon className="w-3 h-3 text-indigo-400"/> {agentFields.length} 智能体</span>}
                </span>
             </div>
             
             {manualFields.length > 0 ? manualFields.map(v => (
                 <div key={v.id}>
                     <label className="text-xs font-medium text-gray-400 mb-1 flex justify-between">
                        <span>{v.label}</span>
                        <span className="text-[10px] text-yellow-600 font-mono">/{v.name}</span>
                     </label>
                     <input 
                        type="text"
                        value={inputs[v.id] || ''}
                        onChange={(e) => onInputChange(v.id, e.target.value)}
                        className="w-full text-sm p-2 bg-black/40 border border-white/10 rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 text-gray-200 placeholder-gray-700 transition-colors"
                        placeholder={`输入 ${v.label}...`}
                     />
                 </div>
             )) : (
                 <p className="text-xs text-gray-500 italic">此模板仅包含智能体，点击企鹅按钮自动运行。</p>
             )}
        </div>
    );
}

const RightPanel: React.FC<RightPanelProps> = ({
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
  creativeIdeas,
  handleUseCreativeIdea,
  setAddIdeaModalOpen,
  setView,
  aspectRatio,
  setAspectRatio,
  imageSize,
  setImageSize,
  isThirdPartyApiEnabled,
}) => (
  <aside className="w-[380px] bg-black/40 backdrop-blur-2xl flex-shrink-0 flex flex-col h-full border-l border-white/10 z-20">
     <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Prompt Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {(activeSmartTemplate || activeSmartPlusTemplate || activeBPTemplate) ? '关键词' : '提示词'}
             </h2>
             {isThirdPartyApiEnabled ? (
               <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">Nano-banana-2</span>
             ) : (
               <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Gemini 3 Pro</span>
             )}
          </div>
          
           {activeBPTemplate && (
               <BPModePanel 
                    template={activeBPTemplate}
                    inputs={bpInputs}
                    onInputChange={setBpInput}
               />
           )}

           <div className="relative group">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeBPTemplate
                    ? "生成的提示词将显示在这里..."
                    : activeSmartTemplate
                    ? `"${activeSmartTemplate.title}" 的关键词...\n例如: '钢铁侠'`
                    : activeSmartPlusTemplate
                    ? `(可选) 场景关键词...\n例如: '微笑着, 霓虹灯光'`
                    : "描述你想要生成的画面..."
                }
                readOnly={!!activeBPTemplate} // BP mode: read only until generated
                className={`w-full h-40 p-4 pr-12 bg-white/5 border border-white/10 rounded-2xl transition-all duration-300 resize-none text-sm text-gray-200 shadow-inner placeholder-gray-600 ${
                    activeBPTemplate ? 'focus:ring-yellow-500/50 focus:border-yellow-500/50' : 'focus:ring-indigo-500/50 focus:border-indigo-500/50'
                }`}
              />
              <button
                onClick={handleGenerateSmartPrompt}
                disabled={!canGenerateSmartPrompt}
                className={`absolute top-3 right-3 p-2 text-white rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 ${
                    activeBPTemplate 
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600 hover:shadow-yellow-500/30' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:shadow-indigo-500/30'
                }`}
                title={activeBPTemplate ? "运行智能体 & 编译 Prompt" : "生成/更新提示词"}
              >
                  {smartPromptGenStatus === ApiStatus.Loading ? (
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <PenguinIcon className="w-4 h-4" />
                  )}
              </button>
           </div>
        </div>
        
        {activeSmartPlusTemplate && (
            <SmartPlusDirector 
                config={smartPlusOverrides} 
                onConfigChange={setSmartPlusOverrides}
                templateConfig={activeSmartPlusTemplate.smartPlusConfig}
            />
        )}

        <div className="space-y-4 pt-4 border-t border-white/10">
             {/* Model Config Card */}
             <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                 <div className="flex items-center gap-2 mb-4 text-gray-400">
                    <ImageIcon className="w-4 h-4"/>
                    <h3 className="text-xs font-bold uppercase tracking-wider">模型参数</h3>
                 </div>
                 
                 <div className="space-y-5">
                    <div>
                        <div className="flex justify-between mb-2">
                             <span className="text-[10px] font-semibold text-gray-500 uppercase">画面比例</span>
                             <span className="text-[10px] text-indigo-400 font-mono">{aspectRatio}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {['Auto', '1:1', '3:4', '4:3', '9:16', '16:9'].map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio)}
                                    className={`py-1.5 text-[10px] font-semibold rounded-lg border transition-all ${
                                        aspectRatio === ratio
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50'
                                            : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                                    }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                             <span className="text-[10px] font-semibold text-gray-500 uppercase">分辨率</span>
                             <span className="text-[10px] text-teal-400 font-mono">{imageSize}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             {['1K', '2K', '4K'].map(size => (
                                <button
                                    key={size}
                                    onClick={() => setImageSize(size)}
                                    className={`py-1.5 text-[10px] font-semibold rounded-lg border transition-all ${
                                        imageSize === size
                                            ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-900/50'
                                            : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                 </div>
             </div>

            {/* Creative Library Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2 text-gray-400">
                        <LibraryIcon className="w-4 h-4"/>
                        <h3 className="text-xs font-bold uppercase tracking-wider">创意库</h3>
                     </div>
                     <button
                        onClick={() => setView('library')}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        查看全部
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {creativeIdeas.length > 0 ? creativeIdeas.slice(0, 3).map(idea => (
                    <div 
                      key={idea.id}
                      onClick={() => handleUseCreativeIdea(idea)}
                      className="group flex flex-col items-center gap-2 cursor-pointer"
                      title={idea.title}
                    >
                      <div className="w-full aspect-square bg-black/40 rounded-xl border border-white/10 overflow-hidden transition-all duration-300 group-hover:border-indigo-500/50 group-hover:shadow-lg group-hover:shadow-indigo-500/20 relative">
                        <img src={idea.imageUrl} alt={idea.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
                         <div className="absolute top-1 left-1 flex flex-col gap-1">
                            {idea.isSmart && (
                                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
                            )}
                             {idea.isSmartPlus && (
                                <span className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"></span>
                            )}
                             {idea.isBP && (
                                <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></span>
                            )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium truncate w-full text-center group-hover:text-gray-200 transition-colors">
                        {idea.title}
                      </p>
                    </div>
                  )) : (
                    <p className="text-xs text-center text-gray-600 py-6 col-span-3 italic">
                      空空如也
                    </p>
                  )}
                  <button
                        onClick={() => setAddIdeaModalOpen(true)}
                        className="aspect-square rounded-xl border border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/10 flex flex-col items-center justify-center gap-1 transition-all group"
                    >
                        <PlusCircleIcon className="w-5 h-5 text-gray-600 group-hover:text-indigo-400"/>
                        <span className="text-[10px] text-gray-600 group-hover:text-indigo-400">添加</span>
                  </button>
                </div>
            </div>
        </div>
     </div>
  </aside>
);

const Canvas: React.FC<CanvasProps> = ({
  view,
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
}) => (
   <main className="flex-1 flex flex-col items-center justify-center min-w-0 bg-gray-950 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-950 to-gray-950 pointer-events-none"></div>
      
      <div className="relative z-10 w-full h-full p-8 flex flex-col">
          {view === 'library' ? (
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
          ) : files.length === 0 ? (
              <WelcomeScreen onUploadClick={onUploadClick} />
          ) : (
             <GeneratedImageDisplay
                status={status}
                error={error}
                content={content}
                onPreviewClick={onPreviewClick}
              />
          )}
      </div>
   </main>
);

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

  const [apiKey, setApiKey] = useState<string>('');
  const [creativeIdeas, setCreativeIdeas] = useState<CreativeIdea[]>([]);
  
  const [view, setView] = useState<'editor' | 'library'>('editor');
  const [isAddIdeaModalOpen, setAddIdeaModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<CreativeIdea | null>(null);
  
  const [activeSmartTemplate, setActiveSmartTemplate] = useState<CreativeIdea | null>(null);
  const [activeSmartPlusTemplate, setActiveSmartPlusTemplate] = useState<CreativeIdea | null>(null);
  const [smartPlusOverrides, setSmartPlusOverrides] = useState<SmartPlusConfig>(() => JSON.parse(JSON.stringify(defaultSmartPlusConfig)));

  // BP Mode States
  const [activeBPTemplate, setActiveBPTemplate] = useState<CreativeIdea | null>(null);
  const [bpInputs, setBpInputs] = useState<Record<string, string>>({});
  
  // No global polish switch needed for BP anymore, as agents handle intelligence
  // const [bpPolish, setBpPolish] = useState(false); 

  // New State for Model Config
  const [aspectRatio, setAspectRatio] = useState<string>('Auto');
  const [imageSize, setImageSize] = useState<string>('2K');

  const [autoSave, setAutoSave] = useState(false);
  
  // 第三方API配置状态
  const [thirdPartyApiConfig, setThirdPartyApiConfig] = useState<ThirdPartyApiConfig>({
    enabled: false,
    baseUrl: '',
    apiKey: '',
    model: 'nano-banana-2'
  });
  
  // 历史记录状态
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importIdeasInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      initializeAiClient(savedApiKey);
    }
    
    // 加载第三方API配置
    const savedThirdPartyConfig = localStorage.getItem('third_party_api_config');
    if (savedThirdPartyConfig) {
      try {
        const config = JSON.parse(savedThirdPartyConfig) as ThirdPartyApiConfig;
        setThirdPartyApiConfig(config);
        setThirdPartyConfig(config);
      } catch (e) {
        console.error('Failed to parse third party API config:', e);
      }
    }
    
    const loadIdeas = async () => {
      try {
        let ideas = await getAllFromDB();
        ideas.sort((a, b) => (b.order || 0) - (a.order || 0)); 
        setCreativeIdeas(ideas);
      } catch (e) {
        console.error("Failed to load creative ideas from DB", e);
      }
    };
    loadIdeas();
    
    // 加载历史记录
    const loadHistory = async () => {
      try {
        let history = await getAllHistoryFromDB();
        history.sort((a, b) => b.timestamp - a.timestamp); // 按时间倒序
        setGenerationHistory(history);
      } catch (e) {
        console.error("Failed to load history from DB", e);
      }
    };
    loadHistory();
    
    const savedAutoSave = localStorage.getItem('auto_save_enabled');
    if (savedAutoSave) {
        setAutoSave(JSON.parse(savedAutoSave));
    }
  }, []);

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
  
  // 第三方API配置变更处理
  const handleThirdPartyConfigChange = (config: ThirdPartyApiConfig) => {
    setThirdPartyApiConfig(config);
    setThirdPartyConfig(config);
    localStorage.setItem('third_party_api_config', JSON.stringify(config));
  };
  
  // 历史记录操作
  const handleHistorySelect = (item: GenerationHistory) => {
    setGeneratedContent({ imageUrl: item.imageUrl, text: null });
    setPrompt(item.prompt);
    setStatus(ApiStatus.Success);
  };
  
  const handleHistoryDelete = async (id: number) => {
    try {
      await deleteHistoryFromDB(id);
      setGenerationHistory(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error("Failed to delete history:", e);
    }
  };
  
  const handleHistoryClear = async () => {
    if (!confirm('确定要清空所有历史记录吗？')) return;
    try {
      await clearAllHistoryFromDB();
      setGenerationHistory([]);
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
  };
  
  const saveToHistory = async (imageUrl: string, promptText: string, isThirdParty: boolean) => {
    const historyItem: GenerationHistory = {
      id: Date.now(),
      imageUrl,
      prompt: promptText,
      timestamp: Date.now(),
      model: isThirdParty ? (thirdPartyApiConfig.model || 'nano-banana-2') : 'Gemini 3 Pro',
      isThirdParty
    };
    try {
      await saveHistoryToDB(historyItem);
      setGenerationHistory(prev => [historyItem, ...prev].slice(0, 50)); // 最多保存50条
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };
  
  const downloadImage = useCallback((url: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = filename || `ai-generated-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  await importToDB(ideas as CreativeIdea[]);
                  const allIdeas = await getAllFromDB();
                  allIdeas.sort((a, b) => (b.order || 0) - (a.order || 0));
                  setCreativeIdeas(allIdeas);
                  alert(`已导入 ${ideas.length} 个创意!`);
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
    try {
      let ideaToSave: CreativeIdea;

      if (idea.id) { // Existing idea
          const existingIdea = creativeIdeas.find(i => i.id === idea.id);
          ideaToSave = { ...existingIdea, ...idea, id: idea.id } as CreativeIdea;
      } else { // New idea
          const newOrder = creativeIdeas.length > 0 ? Math.max(...creativeIdeas.map(i => i.order || 0)) + 1 : 1;
          ideaToSave = { ...idea, id: Date.now(), order: newOrder } as CreativeIdea;
      }

      await saveToDB(ideaToSave);

      const updatedIdeas = await getAllFromDB();
      updatedIdeas.sort((a, b) => (b.order || 0) - (a.order || 0));
      setCreativeIdeas(updatedIdeas);

      setAddIdeaModalOpen(false);
      setEditingIdea(null);
    } catch (e) {
      console.error("Failed to save creative idea:", e);
      alert(`保存失败: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDeleteCreativeIdea = async (id: number) => {
    try {
      await deleteFromDB(id);
      
      const updatedIdeas = await getAllFromDB();
      updatedIdeas.sort((a, b) => (b.order || 0) - (a.order || 0));
      setCreativeIdeas(updatedIdeas);
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
        await Promise.all(ideasToUpdate.map(idea => saveToDB(idea)));
    } catch (e) {
        console.error("Failed to reorder ideas:", e);
    }
  };


  const handleUseCreativeIdea = (idea: CreativeIdea) => {
    setActiveSmartTemplate(null);
    setActiveSmartPlusTemplate(null);
    setActiveBPTemplate(null);
    
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

    // 检查API配置：要么有Gemini Key，要么启用了第三方API
    const hasValidApi = apiKey || (thirdPartyApiConfig.enabled && thirdPartyApiConfig.apiKey);

    setSmartPromptGenStatus(ApiStatus.Loading);
    setError(null);

    try {
      if (activeBPTemplate) {
          // BP Mode Logic (New Orchestration)
          if (!hasValidApi) {
             alert('BP 模式运行智能体需要配置 API Key（Gemini 或第三方API）');
             setSmartPromptGenStatus(ApiStatus.Idle);
             return;
          }
           if (!activeFile) {
                alert('BP 模式需要图片作为智能体分析来源');
                setSmartPromptGenStatus(ApiStatus.Idle);
                return;
           }

           const finalPrompt = await processBPTemplate(activeFile, activeBPTemplate, bpInputs);
           setPrompt(finalPrompt);

      } else {
          // Standard/Smart Logic (Legacy)
          if (!hasValidApi) {
             alert('智能提示词生成需要配置 API Key（Gemini 或第三方API）');
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

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error(errorMessage);
      alert(`智能提示词生成失败: ${errorMessage}`);
      setSmartPromptGenStatus(ApiStatus.Error);
    }
  }, [activeFile, prompt, apiKey, thirdPartyApiConfig, activeSmartTemplate, activeSmartPlusTemplate, activeBPTemplate, smartPlusOverrides, bpInputs]);

  const handleGenerateClick = useCallback(async () => {
    // 检查API配置：要么有Gemini Key，要么启用了第三方API
    const hasValidApi = apiKey || (thirdPartyApiConfig.enabled && thirdPartyApiConfig.apiKey);
    if (!hasValidApi) {
      setError('请先配置 API Key（Gemini 或第三方API）');
      setStatus(ApiStatus.Error);
      return;
    }
    if (!activeFile || !prompt) {
      setError('请上传图片并输入提示词');
      setStatus(ApiStatus.Error);
      return;
    }
    
    // Ensure prompt is generated if template is active but prompt box is empty
    if ((activeSmartTemplate || activeSmartPlusTemplate || activeBPTemplate) && !prompt.trim()) {
         setError(`请先点击企鹅按钮生成/填入提示词`);
         setStatus(ApiStatus.Error);
         return;
    }
    
    setStatus(ApiStatus.Loading);
    setError(null);
    setGeneratedContent(null);

    try {
      const result = await editImageWithGemini(activeFile, prompt, { aspectRatio, imageSize });
      setGeneratedContent(result);
      setStatus(ApiStatus.Success);
      
      // 保存到历史记录
      if (result.imageUrl) {
        await saveToHistory(result.imageUrl, prompt, thirdPartyApiConfig.enabled);
      }
      
      if (autoSave && result.imageUrl) {
        downloadImage(result.imageUrl);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error(errorMessage);
      setError(`生成失败: ${errorMessage}`);
      setStatus(ApiStatus.Error);
    }
  }, [activeFile, prompt, apiKey, thirdPartyApiConfig, activeSmartTemplate, activeSmartPlusTemplate, activeBPTemplate, autoSave, downloadImage, aspectRatio, imageSize]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleGenerateClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleGenerateClick]);

  const canGenerate = !!activeFile && prompt.trim().length > 0 && status !== ApiStatus.Loading;
  
  const isSmartReady = !!activeSmartTemplate && prompt.trim().length > 0;
  const isSmartPlusReady = !!activeSmartPlusTemplate;
  const isBPReady = !!activeBPTemplate; // BP is ready to click penguin anytime to fill variables
  
  const canGenerateSmartPrompt = (!!activeFile && (isSmartReady || isSmartPlusReady)) || (isBPReady) && smartPromptGenStatus !== ApiStatus.Loading;

  const handleBpInputChange = (id: string, value: string) => {
      setBpInputs(prev => ({...prev, [id]: value}));
  };

  return (
    <div className="h-screen bg-gray-950 text-gray-100 font-sans flex flex-row overflow-hidden selection:bg-indigo-500/30">
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
      
      <LeftPanel 
        apiKey={apiKey}
        onApiKeySave={handleApiKeySave}
        thirdPartyConfig={thirdPartyApiConfig}
        onThirdPartyConfigChange={handleThirdPartyConfigChange}
        files={files}
        activeFileIndex={activeFileIndex}
        onFileSelection={handleFileSelection}
        onFileRemove={handleFileRemove}
        onFileSelect={setActiveFileIndex}
        onTriggerUpload={() => fileInputRef.current?.click()}
        autoSaveEnabled={autoSave}
        onAutoSaveToggle={handleAutoSaveToggle}
        history={generationHistory}
        onHistorySelect={handleHistorySelect}
        onHistoryDelete={handleHistoryDelete}
        onHistoryClear={handleHistoryClear}
      />
      <div className="relative flex-1 flex min-w-0">
        <Canvas 
          view={view}
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
        />
        {view === 'editor' && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <GenerateButton 
                    onClick={handleGenerateClick}
                    disabled={!canGenerate}
                    status={status}
                />
             </div>
        )}
      </div>
      <RightPanel 
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
        creativeIdeas={creativeIdeas}
        handleUseCreativeIdea={handleUseCreativeIdea}
        setAddIdeaModalOpen={() => setAddIdeaModalOpen(true)}
        setView={setView}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        imageSize={imageSize}
        setImageSize={setImageSize}
        isThirdPartyApiEnabled={thirdPartyApiConfig.enabled}
      />
      
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
    </div>
  );
};

export default App;
