import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { CanvasNodeData } from '../index';
import { useTheme } from '../../../contexts/ThemeContext';

const TextNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { theme } = useTheme();
  const nodeData = data as CanvasNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(nodeData.text || '');

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    nodeData.onEdit?.(id, { text });
  }, [id, text, nodeData]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setText(nodeData.text || '');
    }
    e.stopPropagation();
  }, [nodeData.text]);

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all backdrop-blur-xl min-w-[180px] max-w-[260px]`}
      style={{
        borderColor: selected ? '#facc15' : 'rgba(234, 179, 8, 0.4)',
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(245, 158, 11, 0.15))',
        boxShadow: selected ? '0 10px 40px -10px rgba(234, 179, 8, 0.4)' : '0 4px 20px -4px rgba(0,0,0,0.5)',
      }}
    >
      {/* 连接点 - 备注节点可选择性连接 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-yellow-400 !border-2 !border-yellow-600 hover:!scale-125 transition-transform"
      />

      {/* 节点头部 */}
      <div 
        className="px-4 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}
      >
        <span className="text-lg">📝</span>
        <span className="text-sm font-bold text-yellow-300 flex-1">备注</span>
        <button
          onClick={() => nodeData.onDelete?.(id)}
          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 文本输入 */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-20 bg-black/40 border border-yellow-500/30 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-yellow-400 transition-colors"
            placeholder="输入备注..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full min-h-[50px] bg-black/20 rounded-xl p-3 text-sm text-gray-300 cursor-text hover:bg-black/30 transition-colors border-2 border-dashed border-transparent hover:border-yellow-500/30"
          >
            {text || <span className="text-gray-500 italic">点击添加备注...</span>}
          </div>
        )}
      </div>

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-yellow-400 !border-2 !border-yellow-600 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default memo(TextNode);
