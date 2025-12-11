import React, { useState, useRef, useEffect } from 'react';
import { CreativeIdea, RHInputField } from '../types';
import { generateWithRunningHub, uploadToRunningHub, runAIApp, RHNodeInfo, RHAIAppNodeInfo } from '../services/api/runninghub';
import { useRunningHubTasks } from '../contexts/RunningHubTaskContext';

interface RunningHubGeneratorProps {
    idea: CreativeIdea;
    onBack: () => void;
    onSuccess: (imageUrl: string, taskId: string) => void;
    onError: (error: string) => void;
    onBackgroundRun?: () => void; // 用户选择后台运行时调用
}

export const RunningHubGenerator: React.FC<RunningHubGeneratorProps> = ({
    idea,
    onBack,
    onSuccess,
    onError,
    onBackgroundRun
}) => {
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
    const [progress, setProgress] = useState<string>('');
    const [canGoBackground, setCanGoBackground] = useState(false); // 上传完成后可以后台运行

    const { addTask, updateTask } = useRunningHubTasks();
    const taskIdRef = useRef<string | null>(null);

    const config = idea.runningHubConfig;

    // 清理预览 URL
    useEffect(() => {
        return () => {
            Object.values(previewUrls).forEach((url: string) => URL.revokeObjectURL(url));
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!config) return null;

    const handleInputChange = (fieldId: string, value: string) => {
        setInputs(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleFileChange = async (fieldId: string, file: File | null) => {
        if (file) {
            // 创建预览
            const url = URL.createObjectURL(file);
            setPreviewUrls(prev => ({ ...prev, [fieldId]: url }));
            setUploadedFiles(prev => ({ ...prev, [fieldId]: file }));
        } else {
            // 清除
            if (previewUrls[fieldId]) URL.revokeObjectURL(previewUrls[fieldId]);
            setPreviewUrls(prev => {
                const next = { ...prev };
                delete next[fieldId];
                return next;
            });
            setUploadedFiles(prev => {
                const next = { ...prev };
                delete next[fieldId];
                return next;
            });
        }
    };

    const handleGenerate = async () => {
        if (!config) return;

        setIsGenerating(true);
        setProgress('准备上传资源...');

        try {
            // 构建节点信息列表
            const nodeInfoList: (RHNodeInfo | RHAIAppNodeInfo)[] = [];

            // 1. 先处理所有图片上传
            const imageFields = config.inputFields.filter(f => f.type === 'image');

            for (const field of imageFields) {
                if (field.required && !uploadedFiles[field.id]) {
                    throw new Error(`请上传 ${field.label}`);
                }

                if (uploadedFiles[field.id]) {
                    setUploadingState(prev => ({ ...prev, [field.id]: true }));
                    setProgress(`正在上传 ${field.label}...`);

                    try {
                        const uploadResult = await uploadToRunningHub(uploadedFiles[field.id]);
                        if (!uploadResult.success) {
                            throw new Error(`上传 ${field.label} 失败: ${uploadResult.error}`);
                        }

                        // 将上传后的文件名/URL 存入 inputs
                        // 注意：RunningHub API 通常只需要文件名，或者是特定的格式
                        // 这里假设返回的 fileName 就是 API 需要的值
                        const fileValue = uploadResult.fileName!;

                        nodeInfoList.push({
                            nodeId: field.nodeId,
                            fieldName: field.fieldName,
                            fieldValue: fileValue,
                            ...(config.isAIApp && { description: field.label })
                        });
                    } finally {
                        setUploadingState(prev => ({ ...prev, [field.id]: false }));
                    }
                }
            }

            // 2. 处理其他字段
            const otherFields = config.inputFields.filter(f => f.type !== 'image');
            for (const field of otherFields) {
                const value = inputs[field.id] || field.defaultValue || '';
                if (field.required && !value) {
                    throw new Error(`请输入 ${field.label}`);
                }

                if (value) {
                    nodeInfoList.push({
                        nodeId: field.nodeId,
                        fieldName: field.fieldName,
                        fieldValue: value,
                        ...(config.isAIApp && { description: field.label })
                    });
                }
            }

            setProgress('🎨 AI 正在精心绘制中，可以返回首页...');
            setCanGoBackground(true); // 上传完成，允许后台运行

            // 创建后台任务记录
            const taskId = `rh_${Date.now()}`;
            taskIdRef.current = taskId;
            addTask(taskId, idea.title);
            updateTask(taskId, { status: 'generating', progress: 'AI 正在云端绘制...' });

            // 3. 调用生成 API
            let result;
            if (config.isAIApp) {
                result = await runAIApp(
                    config.workflowId,
                    nodeInfoList as RHAIAppNodeInfo[],
                    idea.cost
                );
            } else {
                result = await generateWithRunningHub(
                    config.workflowId,
                    nodeInfoList as RHNodeInfo[],
                    idea.cost
                );
            }

            if (result.success && result.data?.outputs?.[0]) {
                setProgress('✨ 处理完成！即将展示...');
                updateTask(taskId, {
                    status: 'completed',
                    progress: '生成完成',
                    imageUrl: result.data.outputs[0].fileUrl
                });
                setTimeout(() => {
                    onSuccess(result.data!.outputs[0].fileUrl, result.data!.taskId);
                }, 800);
            } else {
                updateTask(taskId, { status: 'failed', progress: '生成失败', error: result.error });
                throw new Error(result.error || '生成任务失败，请稍后重试');
            }

        } catch (error: any) {
            console.error('生成错误:', error);
            if (taskIdRef.current) {
                updateTask(taskIdRef.current, {
                    status: 'failed',
                    progress: '生成失败',
                    error: error.message
                });
            }
            onError(error.message || '生成过程中发生未知错误');
        } finally {
            setIsGenerating(false);
            setProgress('');
            setCanGoBackground(false);
        }
    };

    // 渲染图片上传组件
    const renderImageUpload = (field: RHInputField) => {
        const isUploading = uploadingState[field.id];
        const preview = previewUrls[field.id];

        return (
            <div key={field.id} className="col-span-1 min-h-[240px]">
                <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-pink-500 text-xs bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">必填</span>}
                </label>

                <div
                    className={`
                relative w-full h-64 rounded-2xl border-2 border-dashed transition-all duration-300 group overflow-hidden
                ${preview
                            ? 'border-purple-500/50 bg-gray-900/50'
                            : 'border-gray-600 bg-gray-800/30 hover:border-purple-400 hover:bg-gray-800/50'
                        }
            `}
                >
                    {preview ? (
                        <>
                            <img
                                src={preview}
                                alt={field.label}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                <button
                                    onClick={() => document.getElementById(`file-${field.id}`)?.click()}
                                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110"
                                    title="更换图片"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleFileChange(field.id, null)}
                                    className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-md shadow-lg transition-all hover:scale-110"
                                    title="删除图片"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            {/* 上传状态遮罩 */}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <span className="text-white text-sm font-medium">上传中...</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <label
                            htmlFor={`file-${field.id}`}
                            className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                        >
                            <div className="p-4 bg-gray-800/50 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:bg-purple-500/20">
                                <svg className="w-8 h-8 text-gray-400 group-hover:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">点击上传 {field.label}</p>
                            <p className="text-xs text-gray-500 mt-1">支持 PNG, JPG, WEBP</p>
                        </label>
                    )}

                    <input
                        id={`file-${field.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileChange(field.id, file);
                        }}
                    />
                </div>
            </div>
        );
    };

    const imageFields = config.inputFields.filter(f => f.type === 'image');
    const otherFields = config.inputFields.filter(f => f.type !== 'image');

    return (
        <div className="flex w-full h-full text-white overflow-hidden bg-[#0f1115] relative">
            {/* 动态背景 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/10 via-transparent to-blue-900/10 z-0"></div>
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[120px]"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full h-full flex flex-col max-w-7xl mx-auto">

                {/* 顶部导航 */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/20 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                        >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                {idea.title}
                            </h1>
                            {idea.cost && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-medium flex items-center gap-1">
                                        💎 消耗 {idea.cost} 鹅卵石
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500">RunningHub Context</p>
                            <p className="text-xs font-mono text-purple-400">{config.isAIApp ? 'AI Application' : 'ComfyUI Workflow'}</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <span className="text-white font-bold text-xs">RH</span>
                        </div>
                    </div>
                </div>

                {/* 主内容区 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                        {/* 左侧：输入区域 */}
                        <div className="lg:col-span-8 flex flex-col gap-8">
                            {/* 提示信息 */}
                            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <span className="text-xl">✨</span> 灵感描述
                                </h3>
                                <p className="text-gray-400 leading-relaxed text-sm">
                                    {idea.prompt || "上传图片，让 AI 施展魔法。请确保上传高质量的清晰图片以获得最佳效果。"}
                                </p>
                            </div>

                            {/* 图片上传网格 */}
                            {imageFields.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        图像素材
                                    </h3>
                                    <div className={`grid gap-6 ${imageFields.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                        {imageFields.map(renderImageUpload)}
                                    </div>
                                </div>
                            )}

                            {/* 其他输入字段 */}
                            {otherFields.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        参数配置
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {otherFields.map(field => (
                                            <div key={field.id} className="bg-gray-800/30 p-4 rounded-xl border border-white/5">
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    {field.label}
                                                    {field.required && <span className="text-pink-400 ml-1">*</span>}
                                                </label>
                                                {field.type === 'select' ? (
                                                    <select
                                                        value={inputs[field.id] || ''}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                                                    >
                                                        <option value="">请选择...</option>
                                                        {field.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={field.type === 'number' ? 'number' : 'text'}
                                                        value={inputs[field.id] || ''}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none placeholder-gray-600"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 右侧：操作区 */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="sticky top-0 space-y-6">
                                <div className="bg-gradient-to-b from-gray-800/40 to-gray-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                                    <h3 className="text-lg font-semibold text-white mb-6">准备生成</h3>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">预计消耗</span>
                                            <span className="text-amber-400 font-medium">{idea.cost || 0} 鹅卵石</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">预计耗时</span>
                                            <span className="text-white">~1-2 分钟</span>
                                        </div>
                                        {imageFields.map(f => (
                                            <div key={f.id} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400 flex items-center gap-2">
                                                    {uploadedFiles[f.id] ? (
                                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border border-gray-600"></div>
                                                    )}
                                                    {f.label}
                                                </span>
                                                <span className={uploadedFiles[f.id] ? "text-green-400" : "text-gray-600"}>
                                                    {uploadedFiles[f.id] ? "已就绪" : "待上传"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className={`
                                    w-full py-4 text-lg font-bold rounded-xl shadow-lg transition-all duration-300
                                    flex items-center justify-center gap-2 group
                                    ${isGenerating
                                                ? 'bg-gray-700 cursor-not-allowed opacity-80'
                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/25 hover:translate-y-[-2px] active:translate-y-[0px]'
                                            }
                                `}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>生成中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                <span>立即生成</span>
                                            </>
                                        )}
                                    </button>

                                    {isGenerating && (
                                        <div className="mt-4 p-4 bg-black/20 rounded-lg animate-fade-in">
                                            <p className="text-center text-sm text-purple-300 font-medium mb-2">{progress}</p>
                                            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full animate-progress"></div>
                                            </div>

                                            {canGoBackground ? (
                                                <>
                                                    <p className="text-center text-xs text-green-400 mt-3 mb-2">
                                                        ✓ 上传完成！你现在可以返回首页，任务将在后台继续运行
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            if (onBackgroundRun) onBackgroundRun();
                                                            onBack();
                                                        }}
                                                        className="w-full py-2.5 bg-green-600/80 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                        </svg>
                                                        返回首页（后台继续运行）
                                                    </button>
                                                </>
                                            ) : (
                                                <p className="text-center text-xs text-gray-500 mt-2">
                                                    正在上传，请稍候...
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 20px; }
        @keyframes progress {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 95%; }
        }
        .animate-progress {
            animation: progress 30s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default RunningHubGenerator;
