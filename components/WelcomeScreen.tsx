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
          上传图片，描述你的创意，AI 将为你施展魔法。
        </p>
        <button
          onClick={onUploadClick}
          className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg text-base shadow-lg hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 mx-auto"
        >
          <UploadIcon className="w-5 h-5" />
          <span>上传图片开始</span>
        </button>
      </div>
    </div>
  );
};