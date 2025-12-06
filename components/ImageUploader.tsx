import React, { useState, useCallback, useEffect } from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

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
}> = ({ file, isActive, onClick, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div
      onClick={onClick}
      className={`relative group aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-indigo-500' : 'ring-1 ring-gray-700'}`}
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
      className={`w-full flex-grow flex flex-col bg-gray-800/30 border-2 border-dashed ${isDragging ? 'border-indigo-500' : 'border-gray-700'} rounded-lg p-3 transition-colors min-h-0`}
      onDragEnter={handleDragEvents}
      onDragOver={handleDragEvents}
      onDragLeave={handleDragEvents}
      onDrop={handleDrop}
    >
      <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1 flex-grow">
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
          />
        ))}
        <button
          onClick={onTriggerUpload}
          className="aspect-square bg-gray-700/50 hover:bg-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="上传新图片"
        >
          <PlusCircleIcon className="w-8 h-8"/>
          <span className="text-xs mt-1">上传</span>
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        {isDragging ? "松开即可上传" : "可拖拽图片到此区域"}
      </p>
    </div>
  );
};