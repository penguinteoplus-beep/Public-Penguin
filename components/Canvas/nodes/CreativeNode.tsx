import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { CanvasNodeData } from '../index';
import { useTheme } from '../../../contexts/ThemeContext';

const CreativeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { theme } = useTheme();
  const nodeData = data as CanvasNodeData;
  const idea = nodeData.creativeIdea;
  
  // BP变量输入值
  const [bpInputs, setBpInputs] = useState<Record<string, string>>({});

  // 处理变量输入变化
  const handleInputChange = useCallback((fieldId: string, value: string) => {
    setBpInputs(prev => ({ ...prev, [fieldId]: value }));
    // 同步到节点数据
    nodeData.onEdit?.(id, { bpInputValues: { ...bpInputs, [fieldId]: value } });
  }, [id, nodeData, bpInputs]);

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all backdrop-blur-xl min-w-[220px] max-w-[300px]`}
      style={{
        borderColor: selected ? '#c084fc' : 'rgba(168, 85, 247, 0.4)',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15))',
        boxShadow: selected ? '0 10px 40px -10px rgba(168, 85, 247, 0.4)' : '0 4px 20px -4px rgba(0,0,0,0.5)',
      }}
    >
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-purple-400 !border-2 !border-purple-600 hover:!scale-125 transition-transform"
      />

      {/* 节点头部 */}
      <div 
        className="px-4 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}
      >
        <span className="text-lg">🎨</span>
        <span className="text-sm font-bold text-purple-300 flex-1">创意库</span>
        <button
          onClick={() => nodeData.onDelete?.(id)}
          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 创意库信息 */}
      {idea && (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {idea.imageUrl && (
              <img
                src={idea.imageUrl}
                alt={idea.title}
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{idea.title}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 flex-wrap">
                {idea.isBP && <span className="px-1.5 py-0.5 bg-orange-500/30 rounded-md text-orange-300 text-[10px]">BP</span>}
                {idea.isSmartPlus && <span className="px-1.5 py-0.5 bg-cyan-500/30 rounded-md text-cyan-300 text-[10px]">S+</span>}
                {idea.isSmart && <span className="px-1.5 py-0.5 bg-green-500/30 rounded-md text-green-300 text-[10px]">Smart</span>}
                {idea.cost && <span className="text-yellow-400 flex items-center gap-0.5">🪨 {idea.cost}</span>}
              </div>
            </div>
          </div>

          {/* 建议参数显示 */}
          {(idea.suggestedAspectRatio || idea.suggestedResolution) && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {idea.suggestedAspectRatio && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                  <span className="text-xs">🖼️</span>
                  <span className="text-xs text-indigo-300">{idea.suggestedAspectRatio}</span>
                </div>
              )}
              {idea.suggestedResolution && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <span className="text-xs">📷</span>
                  <span className="text-xs text-emerald-300">{idea.suggestedResolution}</span>
                </div>
              )}
            </div>
          )}

          {/* BP模式变量槽 */}
          {idea.isBP && idea.bpFields && idea.bpFields.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span>⚙️</span>
                <span>变量输入</span>
              </div>
              {idea.bpFields.filter(f => f.type === 'input').map(field => (
                <div key={field.id} className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">{field.label}</label>
                  <input
                    type="text"
                    value={bpInputs[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={`输入${field.label}...`}
                    className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                  />
                </div>
              ))}
              {/* 显示智能体字段（只读） */}
              {idea.bpFields.filter(f => f.type === 'agent').length > 0 && (
                <div className="text-xs text-purple-400/70 flex items-center gap-1 mt-1">
                  <span>🤖</span>
                  <span>{idea.bpFields.filter(f => f.type === 'agent').length} 个智能体字段</span>
                </div>
              )}
            </div>
          )}

          {/* 提示词预览 */}
          {idea.allowViewPrompt !== false && idea.prompt && (
            <div className="text-xs text-gray-400 bg-black/30 rounded-xl p-3 line-clamp-2 leading-relaxed">
              {idea.prompt.slice(0, 80)}{idea.prompt.length > 80 ? '...' : ''}
            </div>
          )}
        </div>
      )}

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-purple-400 !border-2 !border-purple-600 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default memo(CreativeNode);
