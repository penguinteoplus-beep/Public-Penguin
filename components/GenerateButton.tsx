import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ApiStatus } from '../types';

interface GenerateButtonProps {
    onClick: () => void;
    disabled: boolean;
    status: ApiStatus;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, disabled, status }) => {
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