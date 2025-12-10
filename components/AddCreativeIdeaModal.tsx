
import React, { useState, useEffect, useCallback } from 'react';
import { CreativeIdea, SmartPlusConfig, SmartPlusComponent, BPField, BPFieldType, BPAgentModel, AspectRatioType, ImageSizeType } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { defaultSmartPlusConfig } from '../App';

interface AddCreativeIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (idea: Partial<CreativeIdea>) => void;
  ideaToEdit?: CreativeIdea | null;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const AddCreativeIdeaModal: React.FC<AddCreativeIdeaModalProps> = ({ isOpen, onClose, onSave, ideaToEdit }) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [ideaType, setIdeaType] = useState<'standard' | 'bp' | 'smartPlus'>('standard');
  const [smartPlusConfig, setSmartPlusConfig] = useState<SmartPlusConfig>(() => JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
  const [bpFields, setBpFields] = useState<BPField[]>([]);
  const [cost, setCost] = useState<number>(0); // Pebbling 鹅卵石扣除数量
  const [suggestedAspectRatio, setSuggestedAspectRatio] = useState<AspectRatioType | ''>('');
  const [suggestedResolution, setSuggestedResolution] = useState<ImageSizeType | ''>('');
  
  // 权限控制
  const [allowViewPrompt, setAllowViewPrompt] = useState<boolean>(true);
  const [allowEditPrompt, setAllowEditPrompt] = useState<boolean>(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setTitle('');
    setPrompt('');
    setIdeaType('standard');
    setSmartPlusConfig(JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
    setBpFields([]);
    setCost(0);
    setSuggestedAspectRatio('');
    setSuggestedResolution('');
    setAllowViewPrompt(true);
    setAllowEditPrompt(true);
    setFile(null);
    setPreviewUrl(null); 
    setError(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (ideaToEdit) {
        console.log('[AddCreativeIdeaModal] 加载编辑数据:', {
          id: ideaToEdit.id,
          suggestedAspectRatio: ideaToEdit.suggestedAspectRatio,
          suggestedResolution: ideaToEdit.suggestedResolution
        });
        
        setTitle(ideaToEdit.title);
        setPrompt(ideaToEdit.prompt);
        setPreviewUrl(ideaToEdit.imageUrl);
        setCost(ideaToEdit.cost || 0);
        setSuggestedAspectRatio(ideaToEdit.suggestedAspectRatio || '');
        setSuggestedResolution(ideaToEdit.suggestedResolution || '');
        setAllowViewPrompt(ideaToEdit.allowViewPrompt !== false); // 默认true
        setAllowEditPrompt(ideaToEdit.allowEditPrompt !== false); // 默认true
        if (ideaToEdit.isBP) {
            setIdeaType('bp');
            // Migration for old bpVariables if needed, though assumed bpFields is used now
            setBpFields(ideaToEdit.bpFields || []);
        } else if (ideaToEdit.isSmartPlus) {
            setIdeaType('smartPlus');
            setSmartPlusConfig(ideaToEdit.smartPlusConfig && ideaToEdit.smartPlusConfig.length > 0 ? ideaToEdit.smartPlusConfig : JSON.parse(JSON.stringify(defaultSmartPlusConfig)));
        } else {
            setIdeaType('standard');
        }
        setFile(null);
      } else {
        resetState();
      }
    }
  }, [isOpen, ideaToEdit, resetState]);

  useEffect(() => {
    const currentUrl = previewUrl;
    return () => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleSmartPlusConfigChange = (
    id: number,
    field: keyof Omit<SmartPlusComponent, 'id'>,
    value: boolean | string
  ) => {
      setSmartPlusConfig(prev => 
        prev.map(item => 
          item.id === id ? { ...item, [field]: value } : item
        )
      );
  };

  const handleAddSmartPlusComponent = () => {
    const newComponent: SmartPlusComponent = {
      id: Date.now(),
      label: '新组件',
      enabled: true,
      features: '',
    };
    setSmartPlusConfig(prev => [...prev, newComponent]);
  };

  const handleDeleteSmartPlusComponent = (id: number) => {
    setSmartPlusConfig(prev => prev.filter(item => item.id !== id));
  };

  // BP Logic
  const handleAddBPField = (type: BPFieldType) => {
      const id = Date.now().toString();
      const count = bpFields.length + 1;
      
      const newField: BPField = {
          id: id,
          type: type,
          name: type === 'input' ? `var${count}` : `agent${count}`,
          label: type === 'input' ? `变量${count}` : `智能体${count}`,
          agentConfig: type === 'agent' ? {
              instruction: "分析图片中的...",
              model: 'gemini-2.5-flash'
          } : undefined
      };
      setBpFields([...bpFields, newField]);
  };

  const handleRemoveBPField = (id: string) => {
      setBpFields(bpFields.filter(v => v.id !== id));
  };

  const handleBPFieldChange = (id: string, field: keyof BPField, value: any) => {
      setBpFields(bpFields.map(v => v.id === id ? { ...v, [field]: value } : v));
  };
  
  const handleBPAgentConfigChange = (id: string, key: 'instruction' | 'model', value: string) => {
      setBpFields(bpFields.map(v => {
          if (v.id === id && v.agentConfig) {
              return { ...v, agentConfig: { ...v.agentConfig, [key]: value } };
          }
          return v;
      }));
  };
  
  const handleSave = async () => {
    if (!title.trim() || !prompt.trim() || !previewUrl) {
      setError("请填写所有必填项并上传图片");
      return;
    }
    setError(null);

    try {
        const imageUrl = file ? await fileToBase64(file) : previewUrl;
        
        const ideaData: Partial<CreativeIdea> = {
          id: ideaToEdit?.id,
          order: ideaToEdit?.order,
          title: title.trim(),
          prompt: prompt.trim(),
          imageUrl: imageUrl!,
          cost: cost,
          suggestedAspectRatio: suggestedAspectRatio !== '' ? suggestedAspectRatio as AspectRatioType : undefined,
          suggestedResolution: suggestedResolution !== '' ? suggestedResolution as ImageSizeType : undefined,
          isSmart: false, 
          isSmartPlus: ideaType === 'smartPlus',
          isBP: ideaType === 'bp',
          smartPlusConfig: ideaType === 'smartPlus' ? smartPlusConfig : undefined,
          bpFields: ideaType === 'bp' ? bpFields : undefined,
          // 权限设置（仅BP/SmartPlus模式有效）
          allowViewPrompt: (ideaType === 'bp' || ideaType === 'smartPlus') ? allowViewPrompt : true,
          allowEditPrompt: (ideaType === 'bp' || ideaType === 'smartPlus') ? allowEditPrompt : true,
        };
        
        console.log('[CreativeIdea] 保存:', { ratio: ideaData.suggestedAspectRatio, res: ideaData.suggestedResolution });
        onSave(ideaData);
    } catch (e) {
        console.error("Failed to process image file for saving:", e);
        setError("无法读取图片文件");
    }
  };

  if (!isOpen) return null;
  
  const modalTitle = ideaToEdit ? "编辑创意" : "新增创意到库";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700 flex flex-col gap-4 animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white">{modalTitle}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">效果图 *</label>
                <input type="file" id="idea-image-upload" accept="image/*" className="hidden" onChange={handleFileChange} />
                 {previewUrl ? (
                     <div className="relative w-full h-48 bg-gray-900 rounded-md">
                         <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-md" />
                          <button
                            onClick={() => { setFile(null); setPreviewUrl(null); }}
                            className="absolute top-1 right-1 p-1 bg-gray-900/50 text-gray-300 hover:text-white rounded-full"
                            aria-label="移除图片"
                          >
                             <XCircleIcon className="w-5 h-5" />
                          </button>
                     </div>
                 ) : (
                    <label htmlFor="idea-image-upload" className="flex flex-col items-center justify-center w-full h-48 p-4 bg-gray-900/50 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer hover:border-indigo-400">
                        <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
                        <p className="text-sm text-gray-400">点击上传或拖拽图片</p>
                    </label>
                 )}
            </div>
            <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="idea-title" className="text-sm font-medium text-gray-300 mb-1 block">标题 *</label>
                  <input
                    id="idea-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-1 focus:ring-indigo-500"
                    placeholder="例如：赛博朋克城市夜景"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">创意模式</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['standard', 'bp', 'smartPlus'] as const).map(type => (
                        <button key={type} onClick={() => setIdeaType(type)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                            ideaType === type 
                            ? type === 'bp' ? 'bg-yellow-600 text-white' : (type === 'smartPlus' ? 'bg-teal-600 text-white' : 'bg-indigo-600 text-white')
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}>
                            {type === 'standard' && 'Standard 标准'}
                            {type === 'bp' && 'BP 模式'}
                            {type === 'smartPlus' && 'SMART+'}
                        </button>
                    ))}
                  </div>
                </div>
                {/* Pebbling 鹅卵石扣除设置 */}
                <div>
                  <label htmlFor="idea-cost" className="text-sm font-medium text-gray-300 mb-1 block flex items-center gap-1">
                    <span>🪨</span> 扣除鹅卵石
                    <span className="text-[10px] text-gray-500 ml-1">(可选)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="idea-cost"
                      type="number"
                      min="0"
                      max="9999"
                      value={cost}
                      onChange={(e) => setCost(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 p-2 bg-gray-900 border border-yellow-700/50 rounded-md focus:ring-1 focus:ring-yellow-500 text-yellow-400 font-bold"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">留空或为0时使用默认扣币</span>
                  </div>
                </div>
            </div>
        </div>
        
        {/* 建议宽高比和分辨率设置 */}
        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <span>🖼️</span> 建议分辨率与宽高比
            <span className="text-[10px] text-gray-500 font-normal">(选中创意库时自动应用)</span>
          </h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">宽高比</label>
              <select
                value={suggestedAspectRatio}
                onChange={(e) => setSuggestedAspectRatio(e.target.value as AspectRatioType | '')}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">不指定</option>
                <option value="Auto">🎲 Auto 自动</option>
                <option value="1:1">■ 1:1 正方形</option>
                <option value="4:3">🖼 4:3 横版</option>
                <option value="3:4">🖼 3:4 竖版</option>
                <option value="16:9">🎬 16:9 宽屏</option>
                <option value="9:16">📱 9:16 手机</option>
                <option value="2:3">📷 2:3 摄影</option>
                <option value="3:2">📷 3:2 摄影横</option>
                <option value="4:5">📸 4:5 社交</option>
                <option value="5:4">📸 5:4 社交横</option>
                <option value="21:9">🎞 21:9 电影</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">分辨率</label>
              <select
                value={suggestedResolution}
                onChange={(e) => setSuggestedResolution(e.target.value as ImageSizeType | '')}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">不指定</option>
                <option value="1K">🖼 1K 快速</option>
                <option value="2K">🖼 2K 标准</option>
                <option value="4K">🖼 4K 高清</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* 权限设置 - 仅BP/SmartPlus模式显示 */}
        {(ideaType === 'bp' || ideaType === 'smartPlus') && (
          <div className="p-4 bg-gray-900/50 rounded-lg border border-orange-700/30">
            <h3 className="text-sm font-semibold text-orange-300 mb-3 flex items-center gap-2">
              <span>🔐</span> 分享权限设置
              <span className="text-[10px] text-gray-500 font-normal">(分享给他人时的权限)</span>
            </h3>
            <div className="space-y-3">
              {/* 允许查看提示词 */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">允许查看提示词</span>
                  <span className="text-[10px] text-gray-500">关闭后他人只能使用，无法查看提示词内容</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={allowViewPrompt}
                    onChange={(e) => {
                      setAllowViewPrompt(e.target.checked);
                      if (!e.target.checked) setAllowEditPrompt(false); // 不能查看就不能编辑
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </div>
              </label>
              
              {/* 允许编辑提示词 */}
              <label className={`flex items-center justify-between cursor-pointer group ${!allowViewPrompt ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">允许编辑提示词</span>
                  <span className="text-[10px] text-gray-500">关闭后他人可以查看但不能修改</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={allowEditPrompt}
                    onChange={(e) => setAllowEditPrompt(e.target.checked)}
                    disabled={!allowViewPrompt}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </div>
              </label>
            </div>
            
            {!allowViewPrompt && (
              <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-[11px] text-orange-300">
                  ⚠️ 不允许查看提示词时，用户只能看到输入框，生成时系统会自动处理提示词。
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* BP Field Manager */}
        {ideaType === 'bp' && (
             <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                     <h3 className="text-sm font-semibold text-yellow-400">BP 配置 (BananaPenguin)</h3>
                     <div className="flex gap-2">
                        <button onClick={() => handleAddBPField('input')} className="text-xs flex items-center gap-1 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 px-2 py-1 rounded">
                            <PlusCircleIcon className="w-3 h-3"/> 手动变量 (Input)
                        </button>
                        <button onClick={() => handleAddBPField('agent')} className="text-xs flex items-center gap-1 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-2 py-1 rounded">
                            <LightbulbIcon className="w-3 h-3"/> AI 智能体 (Agent)
                        </button>
                     </div>
                </div>
                <div className="space-y-3 mb-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {bpFields.map(v => (
                        <div key={v.id} className={`p-3 rounded-lg border ${v.type === 'agent' ? 'bg-indigo-900/20 border-indigo-700' : 'bg-yellow-900/10 border-yellow-800/50'}`}>
                            <div className="flex gap-2 items-center mb-2">
                                <div className="relative flex items-center shrink-0">
                                    <span className={`absolute left-2 text-xs font-mono ${v.type === 'agent' ? 'text-indigo-400' : 'text-yellow-500'}`}>
                                        {v.type === 'agent' ? '{' : '/'}
                                    </span>
                                    <input 
                                        value={v.name} 
                                        onChange={(e) => handleBPFieldChange(v.id, 'name', e.target.value)}
                                        className={`w-24 pl-4 pr-2 p-1 bg-gray-800 border rounded text-xs text-white outline-none font-mono ${v.type === 'agent' ? 'border-indigo-600 focus:border-indigo-400' : 'border-yellow-700 focus:border-yellow-500'}`}
                                        placeholder="Name"
                                        title={v.type === 'agent' ? "Prompt中引用: {name}" : "Prompt中引用: /name"}
                                    />
                                    <span className={`absolute right-2 text-xs font-mono ${v.type === 'agent' ? 'text-indigo-400' : 'text-transparent'}`}>
                                        {v.type === 'agent' ? '}' : ''}
                                    </span>
                                </div>
                                <input 
                                    value={v.label} 
                                    onChange={(e) => handleBPFieldChange(v.id, 'label', e.target.value)}
                                    className="flex-grow p-1 bg-gray-800 border border-gray-600 rounded text-xs text-white focus:border-gray-400 outline-none" 
                                    placeholder="UI显示标签"
                                />
                                <button onClick={() => handleRemoveBPField(v.id)} className="text-gray-500 hover:text-red-400 p-1">
                                    <XCircleIcon className="w-4 h-4"/>
                                </button>
                            </div>
                            
                            {v.type === 'agent' && v.agentConfig && (
                                <div className="space-y-2 mt-2 pt-2 border-t border-indigo-500/30">
                                    <div className="flex gap-2">
                                        <select 
                                            value={v.agentConfig.model}
                                            onChange={(e) => handleBPAgentConfigChange(v.id, 'model', e.target.value)}
                                            className="bg-gray-800 text-xs text-gray-300 border border-gray-600 rounded p-1 w-1/3"
                                        >
                                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                            <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                                        </select>
                                        <div className="flex-grow text-[10px] text-gray-500 flex items-center">
                                           * 2.5 Flash 速度快, 3 Pro 分析更精准
                                        </div>
                                    </div>
                                    <textarea 
                                        value={v.agentConfig.instruction}
                                        onChange={(e) => handleBPAgentConfigChange(v.id, 'instruction', e.target.value)}
                                        className="w-full bg-gray-800/50 text-xs text-gray-200 border border-indigo-900/50 rounded p-2 h-16 resize-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder="给智能体的指令：例如 '分析图中人物的发型和颜色，简短描述。'"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                    {bpFields.length === 0 && <p className="text-xs text-gray-500 italic">配置后，在下方模板中使用 /name (手动) 或 {'{name}'} (智能体) 引用。</p>}
                </div>
             </div>
        )}

        <div>
          <label htmlFor="idea-prompt" className="text-sm font-medium text-gray-300 mb-1 flex justify-between items-end">
            <span>
                {ideaType === 'standard' && "基础提示词 *"}
                {ideaType === 'smartPlus' && "基础场景 *"}
                {ideaType === 'bp' && "BP 编排模板 *"}
            </span>
             {ideaType === 'bp' && bpFields.length > 0 && (
                 <div className="text-[10px] flex gap-2">
                    <span className="text-yellow-500">手动: {bpFields.filter(f => f.type === 'input').map(v => `/${v.name}`).join(' ')}</span>
                    <span className="text-indigo-400">智能体: {bpFields.filter(f => f.type === 'agent').map(v => `{${v.name}}`).join(' ')}</span>
                 </div>
             )}
          </label>
          <textarea
            id="idea-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={`w-full h-28 p-3 bg-gray-900 border rounded-md resize-y focus:ring-1 font-mono text-sm leading-relaxed ${
                ideaType === 'bp' ? 'border-gray-700 focus:border-yellow-500 focus:ring-yellow-500' : 'border-gray-700 focus:ring-indigo-500'
            }`}
            placeholder={
                ideaType === 'smartPlus' 
                ? "输入一个基础场景描述..."
                : ideaType === 'bp'
                ? "示例：一张 /{风格} 的照片，主体是 {主体分析}，背景在 /{地点}。"
                : "输入提示词..."
            }
          />
        </div>
        
        {ideaType === 'smartPlus' && (
             <div className="flex flex-col gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="text-base font-semibold text-teal-400">SMART+ 导演模式配置</h3>
                <div className="flex flex-col gap-3">
                    {smartPlusConfig.map(component => (
                        <div key={component.id} className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={component.enabled}
                                    onChange={(e) => handleSmartPlusConfigChange(component.id, 'enabled', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                            </label>
                            <input
                                type="text"
                                value={component.label}
                                onChange={(e) => handleSmartPlusConfigChange(component.id, 'label', e.target.value)}
                                className="text-sm font-medium text-gray-200 w-28 bg-gray-700/50 border border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-teal-500"
                                placeholder="自定义标签..."
                            />
                            <input
                                type="text"
                                value={component.features}
                                onChange={(e) => handleSmartPlusConfigChange(component.id, 'features', e.target.value)}
                                className="flex-grow p-2 bg-gray-700/50 border border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-teal-500"
                                placeholder={`输入 '${component.label}' 的关键特征...`}
                                disabled={!component.enabled}
                            />
                            <button
                              onClick={() => handleDeleteSmartPlusComponent(component.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              aria-label={`删除组件 ${component.label}`}
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleAddSmartPlusComponent}
                    className="flex items-center justify-center gap-2 text-sm text-teal-300 hover:text-teal-200 bg-gray-700/50 hover:bg-gray-700 rounded-md py-2 transition-colors mt-2"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    <span>添加组件</span>
                </button>
            </div>
        )}

        {error && <p className="text-sm text-red-400 -mt-2">{error}</p>}
        
        <div className="flex justify-end gap-3 mt-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors">
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
