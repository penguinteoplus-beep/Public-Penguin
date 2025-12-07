import React, { useState, useCallback } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { UploadIcon } from './icons/UploadIcon';

interface WelcomeScreenProps {
  onUploadClick: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onUploadClick }) => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gray-950/50 animate-fade-in">
      <div className="max-w-md">
        <div className="mx-auto w-16 h-16 mb-5 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <SparklesIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          欢迎来到艾洛魔法世界
        </h2>
        <p className="text-base text-gray-400 mb-6">
          直接输入提示词生成图片，或上传图片进行编辑创作
        </p>
        <button
          onClick={onUploadClick}
          className="bg-white/10 text-gray-300 font-medium py-2.5 px-5 rounded-lg text-sm hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2 mx-auto border border-white/10"
        >
          <UploadIcon className="w-4 h-4" />
          <span>上传参考图（可选）</span>
        </button>
      </div>
    </div>
  );
};