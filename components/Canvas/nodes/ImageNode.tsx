import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { CanvasNodeData } from '../index';
import { useTheme } from '../../../contexts/ThemeContext';

const ImageNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { theme } = useTheme();
  const nodeData = data as CanvasNodeData;
  const imageUrl = nodeData.imageUrl;
  const onUpload = (nodeData as any).onUpload;

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all backdrop-blur-xl min-w-[180px]`}
      style={{
        borderColor: selected ? '#60a5fa' : 'rgba(59, 130, 246, 0.4)',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(6, 182, 212, 0.15))',
        boxShadow: selected ? '0 10px 40px -10px rgba(59, 130, 246, 0.4)' : '0 4px 20px -4px rgba(0,0,0,0.5)',
      }}
    >
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-blue-400 !border-2 !border-blue-600 hover:!scale-125 transition-transform"
      />

      {/* 节点头部 */}
      <div 
        className="px-4 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}
      >
        <span className="text-lg">📷</span>
        <span className="text-sm font-bold text-blue-300 flex-1">上传图片</span>
        <button
          onClick={() => nodeData.onDelete?.(id)}
          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 图片预览/上传区域 */}
      <div className="p-3">
        {imageUrl ? (
          <div className="relative group">
            <img
              src={imageUrl}
              alt={nodeData.label}
              className="w-full h-28 rounded-xl object-cover"
            />
            <button
              onClick={onUpload}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-white">更换图片</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onUpload}
            className="w-full h-28 rounded-xl bg-black/20 border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/10 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-xs text-blue-400">点击上传图片</span>
          </button>
        )}
      </div>

      {/* 文件名 */}
      {imageUrl && (
        <div className="px-3 pb-3">
          <div className="text-xs text-gray-400 truncate bg-black/20 rounded-lg px-2 py-1.5">
            {nodeData.label || '未命名图片'}
          </div>
        </div>
      )}

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-blue-400 !border-2 !border-blue-600 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default memo(ImageNode);
