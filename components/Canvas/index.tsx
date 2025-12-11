import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  ReactFlowProvider,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from '../../contexts/ThemeContext';
import { CreativeIdea, DesktopImageItem, GeneratedContent } from '../../types';

// 自定义节点组件
import CreativeNode from './nodes/CreativeNode';
import ImageNode from './nodes/ImageNode';
import PromptNode from './nodes/PromptNode';
import TextNode from './nodes/TextNode';
import SaveImageNode from './nodes/SaveImageNode';

// 节点类型定义
export type CanvasNodeType = 'creative' | 'image' | 'prompt' | 'text' | 'saveImage';

export interface CanvasNodeData {
  [key: string]: unknown; // 索引签名，满足 Record<string, unknown> 约束
  label: string;
  type: CanvasNodeType;
  // 创意库节点
  creativeIdea?: CreativeIdea;
  bpInputValues?: Record<string, string>; // BP变量输入值
  // 图片节点
  imageItem?: DesktopImageItem;
  imageUrl?: string;
  // 提示词节点
  promptText?: string;
  // 文本节点
  text?: string;
  // 通用
  onDelete?: (id: string) => void;
  onEdit?: (id: string, data: Partial<CanvasNodeData>) => void;
}

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
  creative: CreativeNode,
  image: ImageNode,
  prompt: PromptNode,
  text: TextNode,
  saveImage: SaveImageNode,
};

// 自定义可删除边组件
interface DeletableEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: React.CSSProperties;
  markerEnd?: string;
  data?: { onDelete?: (id: string) => void };
}

const DeletableEdge: React.FC<DeletableEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={() => data?.onDelete?.(id)}
            className="w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center text-xs transition-all opacity-0 hover:opacity-100 group-hover:opacity-100 shadow-lg border border-red-400/50 hover:scale-110"
            title="删除连接"
            style={{ opacity: 0.7 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// 注册自定义边类型
const edgeTypes: EdgeTypes = {
  deletable: DeletableEdge,
};

interface CanvasProps {
  creativeIdeas: CreativeIdea[];
  desktopImages: DesktopImageItem[];
  onGenerateFromFlow?: (prompt: string, creativeIdea?: CreativeIdea, imageFile?: File, bpInputValues?: Record<string, string>) => Promise<GeneratedContent | null>;
  onSaveImage?: (imageUrl: string, name: string) => void;
  isGenerating?: boolean;
  onPaneClick?: () => void; // 点击画布时收起外层左右面板
}

// 本地存储键名
const CANVAS_STORAGE_KEY = 'canvas_workflow_data';

// 初始节点
const initialNodes: Node<CanvasNodeData>[] = [];
const initialEdges: Edge[] = [];

export const Canvas: React.FC<CanvasProps> = ({
  creativeIdeas,
  desktopImages,
  onGenerateFromFlow,
  onSaveImage,
  isGenerating = false,
  onPaneClick,
}) => {
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageNodeId = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // 从 localStorage 加载工作流
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    try {
      const savedData = localStorage.getItem(CANVAS_STORAGE_KEY);
      if (savedData) {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedData);
        if (savedNodes && savedNodes.length > 0) {
          // 恢复节点，重新绑定回调函数
          const restoredNodes = savedNodes.map((n: any) => {
            const baseData = {
              ...n.data,
              onDelete: handleDeleteNode,
              onEdit: handleEditNode,
            };
            // 图片节点的上传回调
            if (n.type === 'image') {
              baseData.onUpload = () => {
                pendingImageNodeId.current = n.id;
                fileInputRef.current?.click();
              };
            }
            // 保存图片节点的执行回调（将在后面的effect中更新）
            return { ...n, data: baseData };
          });
          setNodes(restoredNodes);
        }
        if (savedEdges && savedEdges.length > 0) {
          // 恢复边，重新绑定删除回调
          const restoredEdges = savedEdges.map((e: any) => ({
            ...e,
            data: { ...e.data, onDelete: handleDeleteEdge }
          }));
          setEdges(restoredEdges);
        }
        console.log('[Canvas] 已恢复工作流:', savedNodes?.length, '节点,', savedEdges?.length, '边');
      }
    } catch (e) {
      console.error('[Canvas] 加载工作流失败:', e);
    }
  }, []); // 只在组件初始化时执行一次

  // 保存工作流到 localStorage
  useEffect(() => {
    // 跳过初始化阶段
    if (!isInitializedRef.current) return;
    
    try {
      // 保存时移除回调函数和临时数据
      const nodesToSave = nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          onDelete: undefined,
          onEdit: undefined,
          onUpload: undefined,
          onExecute: undefined,
          imageFile: undefined, // 不保存File对象
        }
      }));
      const edgesToSave = edges.map(e => ({
        ...e,
        data: { ...e.data, onDelete: undefined }
      }));
      localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({
        nodes: nodesToSave,
        edges: edgesToSave,
        savedAt: Date.now()
      }));
    } catch (e) {
      console.warn('[Canvas] 保存工作流失败:', e);
    }
  }, [nodes, edges]);

  // 删除边
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, [setEdges]);

  // 连接节点 - 优化性能，不使用动画
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'deletable',
      animated: false, // 禁用动画提高性能
      data: { onDelete: handleDeleteEdge },
    }, eds)),
    [setEdges, handleDeleteEdge]
  );

  // 边点击删除（双击删除）
  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      handleDeleteEdge(edge.id);
    },
    [handleDeleteEdge]
  );

  // 键盘删除选中的边
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // 删除选中的边由 onEdgesChange 处理
      }
    },
    []
  );

  // 删除节点
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  // 编辑节点数据
  const handleEditNode = useCallback((nodeId: string, data: Partial<CanvasNodeData>) => {
    setNodes((nds) => nds.map((n) => 
      n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
    ));
  }, [setNodes]);

  // 添加创意库节点
  const addCreativeNode = useCallback((idea: CreativeIdea) => {
    const newNode: Node<CanvasNodeData> = {
      id: `creative-${Date.now()}`,
      type: 'creative',
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {
        label: idea.title,
        type: 'creative',
        creativeIdea: idea,
        onDelete: handleDeleteNode,
        onEdit: handleEditNode,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, handleDeleteNode, handleEditNode]);

  // 添加空图片节点（点击上传）
  const addEmptyImageNode = useCallback(() => {
    const nodeId = `image-${Date.now()}`;
    const newNode: Node<CanvasNodeData> = {
      id: nodeId,
      type: 'image',
      position: { x: 300 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {
        label: '上传图片',
        type: 'image',
        imageUrl: '',
        onDelete: handleDeleteNode,
        onEdit: handleEditNode,
        onUpload: () => {
          pendingImageNodeId.current = nodeId;
          fileInputRef.current?.click();
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, handleDeleteNode, handleEditNode]);

  // 处理图片上传
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && pendingImageNodeId.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setNodes((nds) => nds.map((n) => 
          n.id === pendingImageNodeId.current 
            ? { ...n, data: { ...n.data, imageUrl, label: file.name, imageFile: file } } 
            : n
        ));
        pendingImageNodeId.current = null;
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  }, [setNodes]);

  // 添加提示词节点
  const addPromptNode = useCallback(() => {
    const newNode: Node<CanvasNodeData> = {
      id: `prompt-${Date.now()}`,
      type: 'prompt',
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: {
        label: '提示词',
        type: 'prompt',
        promptText: '',
        onDelete: handleDeleteNode,
        onEdit: handleEditNode,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, handleDeleteNode, handleEditNode]);

  // 添加文本节点
  const addTextNode = useCallback(() => {
    const newNode: Node<CanvasNodeData> = {
      id: `text-${Date.now()}`,
      type: 'text',
      position: { x: 150 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        label: '备注',
        type: 'text',
        text: '',
        onDelete: handleDeleteNode,
        onEdit: handleEditNode,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, handleDeleteNode, handleEditNode]);

  // 添加保存图片节点
  const addSaveImageNode = useCallback(() => {
    const nodeId = `saveImage-${Date.now()}`;
    const newNode: Node<CanvasNodeData> = {
      id: nodeId,
      type: 'saveImage',
      position: { x: 500 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {
        label: '保存图片',
        type: 'saveImage',
        onDelete: handleDeleteNode,
        onEdit: handleEditNode,
        generatedImageUrl: '',
        isGenerating: false,
        onExecute: () => handleExecuteSingleNode(nodeId),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, handleDeleteNode, handleEditNode]);

  // 执行单个保存图片节点
  const handleExecuteSingleNode = useCallback(async (nodeId: string) => {
    if (!onGenerateFromFlow || isExecuting) {
      console.warn('[Flow] 无法执行，正在执行中或缺少回调');
      return;
    }
    
    const saveNode = nodes.find(n => n.id === nodeId);
    if (!saveNode || saveNode.type !== 'saveImage') {
      console.warn('[Flow] 找不到节点:', nodeId);
      return;
    }
    
    // 设置节点为生成中状态
    setNodes(nds => nds.map(n => 
      n.id === nodeId 
        ? { ...n, data: { ...n.data, isGenerating: true, error: undefined } }
        : n
    ));
    
    // 查找连接到该节点的边
    const incomingEdges = edges.filter(e => e.target === nodeId);
    if (incomingEdges.length === 0) {
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, isGenerating: false, error: '请连接创意库或提示词节点' } }
          : n
      ));
      return;
    }
    
    // 收集输入数据
    let prompt = '';
    let creativeIdea: CreativeIdea | undefined;
    let imageFile: File | undefined;
    let bpInputValues: Record<string, string> = {};
    
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (!sourceNode) continue;
      
      switch (sourceNode.type) {
        case 'creative':
          creativeIdea = (sourceNode.data as CanvasNodeData).creativeIdea;
          bpInputValues = (sourceNode.data as CanvasNodeData).bpInputValues || {};
          break;
        case 'prompt':
          const promptText = (sourceNode.data as CanvasNodeData).promptText || '';
          prompt = prompt ? `${prompt} ${promptText}` : promptText;
          break;
        case 'image':
          imageFile = (sourceNode.data as any).imageFile;
          break;
        case 'saveImage':
          const upstreamUrl = (sourceNode.data as any).generatedImageUrl;
          if (upstreamUrl) {
            try {
              const response = await fetch(upstreamUrl);
              const blob = await response.blob();
              imageFile = new File([blob], 'upstream-image.png', { type: blob.type });
            } catch (e) {
              console.error('Failed to fetch upstream image:', e);
            }
          }
          break;
      }
    }
    
    if (!creativeIdea && !prompt) {
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, isGenerating: false, error: '请连接创意库或提示词节点' } }
          : n
      ));
      return;
    }
    
    try {
      console.log('[Flow] 单节点执行:', { nodeId, prompt, creativeIdea: creativeIdea?.title });
      const result = await onGenerateFromFlow(prompt, creativeIdea, imageFile, bpInputValues);
      
      if (result?.imageUrl) {
        setNodes(nds => nds.map(n => 
          n.id === nodeId 
            ? { ...n, data: { ...n.data, generatedImageUrl: result.imageUrl, isGenerating: false, error: undefined } }
            : n
        ));
        if (onSaveImage) {
          onSaveImage(result.imageUrl, `画布生成-${Date.now()}`);
        }
      } else {
        throw new Error('生成结果为空');
      }
    } catch (error: any) {
      console.error('[Flow] 单节点执行失败:', error);
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, isGenerating: false, error: error?.message || '生成失败' } }
          : n
      ));
    }
  }, [nodes, edges, onGenerateFromFlow, onSaveImage, isExecuting]);

  // 确保 saveImage 节点都有执行回调（用于恢复的节点）
  useEffect(() => {
    let needUpdate = false;
    const updatedNodes = nodes.map(n => {
      if (n.type === 'saveImage' && !(n.data as any).onExecute) {
        needUpdate = true;
        return {
          ...n,
          data: {
            ...n.data,
            onExecute: () => handleExecuteSingleNode(n.id),
          }
        };
      }
      return n;
    });
    if (needUpdate) {
      setNodes(updatedNodes);
    }
  }, [nodes, handleExecuteSingleNode, setNodes]);

  // 执行工作流
  const handleExecuteFlow = useCallback(async () => {
    if (!onGenerateFromFlow || isExecuting) return;
    
    // 创建取消控制器
    abortControllerRef.current = new AbortController();
    
    // 查找所有保存图片节点
    const saveImageNodes = nodes.filter(n => n.type === 'saveImage');
    if (saveImageNodes.length === 0) {
      alert('请添加保存图片节点');
      return;
    }

    setIsExecuting(true);
    setExecutionProgress('正在准备执行...');
    
    let successCount = 0;
    let errorCount = 0;
    
    // 对每个保存图片节点执行生成
    for (let i = 0; i < saveImageNodes.length; i++) {
      // 检查是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        setExecutionProgress('已取消');
        break;
      }
      
      const saveNode = saveImageNodes[i];
      setExecutionProgress(`正在处理节点 ${i + 1}/${saveImageNodes.length}...`);
      
      // 查找连接到该节点的边
      const incomingEdges = edges.filter(e => e.target === saveNode.id);
      if (incomingEdges.length === 0) {
        console.warn(`节点 ${saveNode.id} 没有输入连接，跳过`);
        // 更新节点显示错误
        setNodes(nds => nds.map(n => 
          n.id === saveNode.id 
            ? { ...n, data: { ...n.data, error: '请连接创意库或提示词节点' } }
            : n
        ));
        errorCount++;
        continue;
      }
      
      // 收集输入数据
      let prompt = '';
      let creativeIdea: CreativeIdea | undefined;
      let imageFile: File | undefined;
      let bpInputValues: Record<string, string> = {}; // BP模式变量输入值
      
      for (const edge of incomingEdges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) continue;
        
        switch (sourceNode.type) {
          case 'creative':
            creativeIdea = (sourceNode.data as CanvasNodeData).creativeIdea;
            // 获取BP输入值 - 传递给handleGenerateFromFlow让它调用processBPTemplate
            bpInputValues = (sourceNode.data as CanvasNodeData).bpInputValues || {};
            console.log('[Flow] 找到创意库:', creativeIdea?.title, 'isBP:', creativeIdea?.isBP, 'bpInputValues:', bpInputValues);
            break;
          case 'prompt':
            // 如果已经有提示词，则追加
            const promptText = (sourceNode.data as CanvasNodeData).promptText || '';
            if (prompt) {
              prompt = prompt + ' ' + promptText;
            } else {
              prompt = promptText;
            }
            console.log('[Flow] 找到提示词:', promptText);
            break;
          case 'image':
            imageFile = (sourceNode.data as any).imageFile;
            console.log('[Flow] 找到图片:', imageFile?.name);
            break;
          case 'saveImage':
            // 如果上游是保存图片节点，尝试获取它的生成结果作为输入
            const upstreamUrl = (sourceNode.data as any).generatedImageUrl;
            if (upstreamUrl) {
              try {
                const response = await fetch(upstreamUrl);
                const blob = await response.blob();
                imageFile = new File([blob], 'upstream-image.png', { type: blob.type });
                console.log('[Flow] 使用上游节点生成的图片');
              } catch (e) {
                console.error('Failed to fetch upstream image:', e);
              }
            }
            break;
        }
      }
      
      // 检查是否有有效输入
      if (!creativeIdea && !prompt) {
        console.warn(`节点 ${saveNode.id} 没有创意库或提示词`);
        setNodes(nds => nds.map(n => 
          n.id === saveNode.id 
            ? { ...n, data: { ...n.data, error: '请连接创意库或提示词节点' } }
            : n
        ));
        errorCount++;
        continue;
      }
      
      // 设置节点为生成中状态
      setNodes(nds => nds.map(n => 
        n.id === saveNode.id 
          ? { ...n, data: { ...n.data, isGenerating: true, error: undefined } }
          : n
      ));
      
      setExecutionProgress(`正在生成图片 ${i + 1}/${saveImageNodes.length}...`);
      
      try {
        console.log('[Flow] 开始调用生成:', { prompt, creativeIdea: creativeIdea?.title, hasImage: !!imageFile, bpInputValues });
        // 传递bpInputValues给handleGenerateFromFlow，让它调用processBPTemplate处理智能体和变量替换
        const result = await onGenerateFromFlow(prompt, creativeIdea, imageFile, bpInputValues);
        
        if (result?.imageUrl) {
          console.log('[Flow] 生成成功');
          // 更新节点显示生成的图片
          setNodes(nds => nds.map(n => 
            n.id === saveNode.id 
              ? { ...n, data: { ...n.data, generatedImageUrl: result.imageUrl, isGenerating: false, error: undefined } }
              : n
          ));
          
          // 保存到桌面
          if (onSaveImage) {
            onSaveImage(result.imageUrl, `画布生成-${Date.now()}`);
          }
          successCount++;
        } else {
          throw new Error('生成结果为空');
        }
      } catch (error: any) {
        console.error('[Flow] 生成失败:', error);
        const errorMsg = error?.message || '生成失败';
        setNodes(nds => nds.map(n => 
          n.id === saveNode.id 
            ? { ...n, data: { ...n.data, isGenerating: false, error: errorMsg } }
            : n
        ));
        errorCount++;
      }
    }
    
    // 执行完成
    abortControllerRef.current = null;
    setIsExecuting(false);
    setExecutionProgress(successCount > 0 
      ? `完成！成功 ${successCount} 个${errorCount > 0 ? `，失败 ${errorCount} 个` : ''}`
      : `执行完成，${errorCount} 个失败`
    );
    
    // 3秒后清除进度提示
    setTimeout(() => setExecutionProgress(''), 3000);
  }, [nodes, edges, onGenerateFromFlow, onSaveImage, isExecuting]);

  // 取消执行
  const handleCancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setExecutionProgress('正在取消...');
    }
  }, []);

  // 清空画布并清除本地存储
  const handleClearCanvas = useCallback(() => {
    if (!confirm('确定要清空画布吗？此操作不可撤销。')) return;
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(CANVAS_STORAGE_KEY);
    console.log('[Canvas] 已清空画布并清除本地存储');
  }, [setNodes, setEdges]);

  // 点击画布只收起外层左右面板
  const handlePaneClick = useCallback(() => {
    onPaneClick?.(); // 通知外层收起左右面板
  }, [onPaneClick]);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: theme.colors.bgPrimary }}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      
      <ReactFlow
        onPaneClick={handlePaneClick}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        connectionRadius={30}
        connectionLineStyle={{ stroke: theme.colors.primary, strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'deletable',
          animated: false, // 禁用动画提高性能
          style: { stroke: theme.colors.primary, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: theme.colors.primary,
          },
          data: { onDelete: handleDeleteEdge },
        }}
        deleteKeyCode={['Delete', 'Backspace']}
        selectionOnDrag={true} // 启用拖拽框选
        selectionMode={SelectionMode.Partial} // 部分包含即选中
        panOnDrag={[1, 2]} // 中键和右键拖动画布，左键用于框选
        selectionKeyCode={null} // 不需要按键即可框选
        multiSelectionKeyCode={['Control', 'Meta']}
        style={{ background: 'transparent' }}
        proOptions={{ hideAttribution: true }}
      >
        {/* 工具面板 - 始终显示 */}
        <Panel position="top-left">
          <div 
            className="flex flex-col gap-2 p-4 backdrop-blur-xl rounded-2xl border shadow-2xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: theme.colors.border }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🧱</span>
              <span className="text-sm font-bold text-white">节点工具箱</span>
            </div>
            
            {/* 创意库选择 */}
            <div className="relative group">
              <button className="w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 transition-all flex items-center gap-3">
                <span className="text-lg">🎨</span>
                <span>创意库</span>
                <svg className="w-4 h-4 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 p-2 max-h-72 overflow-y-auto min-w-[200px] shadow-2xl">
                  <div className="text-xs text-gray-500 px-3 py-2 border-b border-white/10 mb-2">选择创意库模板</div>
                  {creativeIdeas.length === 0 ? (
                    <div className="text-sm text-gray-500 px-3 py-4 text-center">
                      <span className="text-2xl mb-2 block">📦</span>
                      暂无创意库
                    </div>
                  ) : (
                    creativeIdeas.map((idea) => (
                      <button
                        key={idea.id}
                        onClick={() => addCreativeNode(idea)}
                        className="w-full px-3 py-2.5 text-sm text-left text-gray-300 hover:bg-purple-500/20 rounded-lg transition-colors flex items-center gap-3"
                      >
                        {idea.imageUrl && (
                          <img src={idea.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{idea.title}</div>
                          <div className="text-xs text-gray-500 truncate">{idea.prompt?.slice(0, 30)}...</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 上传图片节点 */}
            <button
              onClick={addEmptyImageNode}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-300 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all flex items-center gap-3"
            >
              <span className="text-lg">📷</span>
              <span>上传图片</span>
            </button>

            <button
              onClick={addPromptNode}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300 hover:from-green-500/30 hover:to-emerald-500/30 transition-all flex items-center gap-3"
            >
              <span className="text-lg">✍️</span>
              <span>提示词</span>
            </button>

            <button
              onClick={addTextNode}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-300 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all flex items-center gap-3"
            >
              <span className="text-lg">📝</span>
              <span>备注</span>
            </button>

            <button
              onClick={addSaveImageNode}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-indigo-300 hover:from-indigo-500/30 hover:to-violet-500/30 transition-all flex items-center gap-3"
            >
              <span className="text-lg">💾</span>
              <span>保存图片</span>
            </button>

            <div className="h-px bg-white/10 my-2" />

            {/* 进度显示 */}
            {executionProgress && (
              <div className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300 text-center">
                {executionProgress}
              </div>
            )}

            {/* 执行/取消按钮 */}
            {isExecuting ? (
              <button
                onClick={handleCancelExecution}
                className="w-full px-4 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>取消执行</span>
              </button>
            ) : (
              <button
                onClick={handleExecuteFlow}
                disabled={nodes.length === 0}
                className="w-full px-4 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
              >
                <span>▶️</span>
                <span>执行流程</span>
              </button>
            )}

            <button
              onClick={handleClearCanvas}
              disabled={nodes.length === 0}
              className="w-full px-4 py-2 text-sm font-medium rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🗑️</span>
              <span>清空画布</span>
            </button>
          </div>
        </Panel>

        {/* 操作提示 - 更美观 */}
        <Panel position="bottom-center">
          <div 
            className="px-4 py-2 backdrop-blur-xl rounded-full border text-xs flex items-center gap-4 shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderColor: theme.colors.border, color: theme.colors.textMuted }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              左键拖动框选
            </span>
            <span className="w-px h-3 bg-white/20"></span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              拖拽连接节点
            </span>
            <span className="w-px h-3 bg-white/20"></span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              双击删除连线
            </span>
            <span className="w-px h-3 bg-white/20"></span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              右键/中键拖动画布
            </span>
          </div>
        </Panel>

        {/* 节点统计 - 更美观 */}
        <Panel position="top-right">
          <div 
            className="px-4 py-2.5 backdrop-blur-xl rounded-xl border shadow-lg flex items-center gap-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderColor: theme.colors.border }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🧩</span>
              <span className="text-sm font-bold text-white">{nodes.length}</span>
              <span className="text-xs text-gray-500">节点</span>
            </div>
            <div className="w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <span className="text-sm font-bold text-white">{edges.length}</span>
              <span className="text-xs text-gray-500">连接</span>
            </div>
          </div>
        </Panel>

        <Controls 
          className="!backdrop-blur-xl !rounded-xl overflow-hidden"
          style={{ 
            backgroundColor: theme.colors.bgPanel, 
            borderColor: theme.colors.border,
            border: `1px solid ${theme.colors.border}`,
          }}
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap 
          className="!backdrop-blur-xl !rounded-xl"
          style={{ 
            backgroundColor: theme.colors.bgPanel, 
            border: `1px solid ${theme.colors.border}`,
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'creative': return '#a855f7';
              case 'image': return '#3b82f6';
              case 'prompt': return '#22c55e';
              case 'text': return '#eab308';
              case 'saveImage': return theme.colors.primary;
              default: return '#6b7280';
            }
          }}
          maskColor={theme.colors.shadow}
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color={theme.colors.border}
        />
      </ReactFlow>
    </div>
  );
};

export default Canvas;
