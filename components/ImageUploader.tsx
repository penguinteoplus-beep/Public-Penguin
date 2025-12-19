import React, { useState, useCallback, useEffect } from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { useTheme } from '../contexts/ThemeContext';

interface ImageUploaderProps {
  files: File[];
  activeFileIndex: number | null;
  onFileChange: (files: FileList | null) => void;
  onFileRemove: (index: number) => void;
  onFileSelect: (index: number) => void;
  onTriggerUpload: () => void;
}

const Thumbnail: React.FC<{
  file: File;
  isActive: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
  isLight: boolean;
}> = ({ file, isActive, onClick, onRemove, isLight }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div
      onClick={onClick}
      className={`relative group aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-indigo-500' : ''}`}
      style={{ border: isActive ? undefined : `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}` }}
    >
      {previewUrl && <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 p-0.5 bg-gray-900/60 text-gray-300 hover:text-white hover:bg-red-600 rounded-full transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
        aria-label={`移除图片 ${file.name}`}
      >
        <XCircleIcon className="w-5 h-5" />
      </button>
    </div>
  );
};


export const ImageUploader: React.FC<ImageUploaderProps> = ({ files, activeFileIndex, onFileChange, onFileRemove, onFileSelect, onTriggerUpload }) => {
  const { themeName } = useTheme();
  const isLight = themeName === 'light';
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEvents = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      onFileChange(e.dataTransfer.files);
    }
  }, [onFileChange]);

  return (
    <div 
      className={`w-full flex-grow flex flex-col border-2 border-dashed rounded-lg p-3 transition-colors min-h-0 ${
        isDragging ? 'border-indigo-500' : ''
      }`}
      style={{
        background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
        borderColor: isDragging ? undefined : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
      }}
      onDragEnter={handleDragEvents}
      onDragOver={handleDragEvents}
      onDragLeave={handleDragEvents}
      onDrop={handleDrop}
    >
      {files.length === 0 ? (
        /* 无图片时居中显示上传按钮 */
        <div className="flex-grow flex items-center justify-center">
          <button
            onClick={onTriggerUpload}
            className="w-24 h-24 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{
              background: isLight 
                ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)' 
                : 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
              border: `2px dashed ${isLight ? 'rgba(99,102,241,0.3)' : 'rgba(139,92,246,0.4)'}`,
              color: isLight ? '#6366f1' : '#a5b4fc'
            }}
            aria-label="上传新图片"
          >
            <PlusCircleIcon className="w-10 h-10"/>
            <span className="text-xs mt-1.5 font-medium">上传图片</span>
          </button>
        </div>
      ) : (
        /* 有图片时使用grid布局 - 根据图片数量调整列数 */
        <div className={`grid gap-3 pr-1 flex-grow ${
          files.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          {files.map((file, index) => (
            <Thumbnail 
              key={`${file.name}-${index}`}
              file={file}
              isActive={index === activeFileIndex}
              onClick={() => onFileSelect(index)}
              onRemove={(e) => {
                e.stopPropagation();
                onFileRemove(index);
              }}
              isLight={isLight}
            />
          ))}
          <button
            onClick={onTriggerUpload}
            className="aspect-square rounded-lg flex flex-col items-center justify-center transition-colors hover:scale-105 active:scale-95"
            style={{
              background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
              color: isLight ? '#64748b' : '#9ca3af'
            }}
            aria-label="上传新图片"
          >
            <PlusCircleIcon className="w-8 h-8"/>
            <span className="text-xs mt-1">上传</span>
          </button>
        </div>
      )}
      <p className="text-xs mt-3 text-center" style={{ color: isLight ? '#94a3b8' : '#6b7280' }}>
        {isDragging ? "松开即可上传" : "可拖拽图片到此区域"}
      </p>
    </div>
  );
};