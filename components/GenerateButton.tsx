import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ApiStatus } from '../types';

interface GenerateButtonProps {
    onClick: () => void;
    disabled: boolean;
    status: ApiStatus;
    // 最小化结果联动
    hasMinimizedResult?: boolean;
    onExpandResult?: () => void;
    isError?: boolean; // 是否是错误状态
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ 
    onClick, 
    disabled, 
    status,
    hasMinimizedResult,
    onExpandResult
}) => {
    // 判断状态
    const isError = status === ApiStatus.Error;
    const isLoading = status === ApiStatus.Loading;
    const isSuccess = status === ApiStatus.Success;
    
    // 如果有最小化结果，按钮本身切换状态（不添加延伸区域）
    if (hasMinimizedResult) {
        // 根据状态确定颜色
        const gradientClass = isLoading 
            ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600'
            : isError 
                ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600'
                : 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500';
        
        const buttonGradient = isLoading
            ? 'bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-700'
            : isError 
                ? 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700'
                : 'bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600';
        
        return (
            <div 
              className="group relative cursor-pointer"
              onClick={onExpandResult}
              title={isLoading ? "点击查看生成进度" : "点击查看生成结果"}
            >
                {/* 发光效果 - 根据状态变色 */}
                <div className={`absolute -inset-3 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse ${gradientClass}`}></div>
                
                {/* 主按钮 - 只改变颜色和图标 */}
                <button
                    className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-300
                        text-white shadow-2xl hover:scale-110 active:scale-95 border-2 border-white/40
                        ${buttonGradient}
                    `}
                >
                    {isLoading ? (
                        <>
                            <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">生成中</span>
                        </>
                    ) : isError ? (
                        <>
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">查看</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">完成</span>
                        </>
                    )}
                </button>
            </div>
        );
    }

    // 正常生成按钮
    return (
        <div 
          className="group relative"
          title="Magic Generate (Ctrl+Enter)"
        >
            <div className={`absolute -inset-2 bg-gradient-to-r from-purple-600 via-indigo-500 to-teal-400 rounded-full blur-md opacity-50 group-hover:opacity-100 animate-pulse transition duration-1000 ${disabled ? 'hidden' : 'block'}`}></div>
            <button
                onClick={onClick}
                disabled={disabled || status === ApiStatus.Loading}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out
                    ${disabled 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                        : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white shadow-2xl hover:scale-105 active:scale-95 border border-white/20'
                    }
                `}
            >
                {status === ApiStatus.Loading ? (
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <SparklesIcon className={`w-8 h-8 transform transition-transform duration-500 ${disabled ? '' : 'group-hover:rotate-12'}`} />
                )}
            </button>
        </div>
    );
};