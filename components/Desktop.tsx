import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DesktopItem, DesktopImageItem, DesktopFolderItem, DesktopStackItem, DesktopPosition, GenerationHistory } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { TrashIcon } from './icons/TrashIcon';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { EditIcon } from './icons/EditIcon';
import { RefreshIcon } from './icons/RefreshIcon';

interface DesktopProps {
  items: DesktopItem[];
  onItemsChange: (items: DesktopItem[]) => void;
  onImageDoubleClick: (item: DesktopImageItem) => void;
  onFolderDoubleClick: (item: DesktopFolderItem) => void;
  openFolderId: string | null;
  onFolderClose: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  gridSize?: number;
  onRenameItem?: (id: string, newName: string) => void;
  // 图片操作回调
  onImagePreview?: (item: DesktopImageItem) => void;
  onImageEditAgain?: (item: DesktopImageItem) => void;
  onImageRegenerate?: (item: DesktopImageItem) => void;
}

const GRID_SIZE = 100; // 网格大小
const ICON_SIZE = 80; // 图标大小
const DRAG_THRESHOLD = 5; // 拖拽阈值，超过此距离才认为是拖拽
export const TOP_OFFSET = 100; // 顶部偏移（公告+搜索区域高度）
export const DESKTOP_COLS = 7; // 固定7列

// 生成唯一ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// 剪贴板状态类型
interface ClipboardState {
  items: DesktopItem[];
  action: 'copy' | 'cut';
}

export const Desktop: React.FC<DesktopProps> = ({
  items,
  onItemsChange,
  onImageDoubleClick,
  onFolderDoubleClick,
  openFolderId,
  onFolderClose,
  selectedIds,
  onSelectionChange,
  gridSize = GRID_SIZE,
  onRenameItem,
  onImagePreview,
  onImageEditAgain,
  onImageRegenerate,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<DesktopPosition | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<DesktopPosition | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    start: DesktopPosition;
    end: DesktopPosition;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId?: string;
  } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasDragged, setHasDragged] = useState(false); // 是否发生了拖拽
  const [justDragged, setJustDragged] = useState(false); // 刚刚完成拖拽（用于防止拖拽后立即触发预览）
  const [hideFileNames, setHideFileNames] = useState(false); // 是否隐藏文件名

  // 获取当前显示的项目（根据是否在文件夹内）
  const baseItems = openFolderId
    ? items.filter(item => {
        const folder = items.find(i => i.id === openFolderId) as DesktopFolderItem | undefined;
        return folder?.itemIds.includes(item.id);
      })
    : items.filter(item => {
        // 只显示不在任何文件夹或叠放内的项目
        const isInFolder = items.some(
          other => other.type === 'folder' && (other as DesktopFolderItem).itemIds.includes(item.id)
        );
        const isInStack = items.some(
          other => other.type === 'stack' && (other as DesktopStackItem).itemIds.includes(item.id)
        );
        return !isInFolder && !isInStack;
      });

  // 根据搜索词过滤
  const currentItems = searchQuery.trim()
    ? baseItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.type === 'image' && (item as DesktopImageItem).prompt?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : baseItems;

  // 监听容器宽度变化（响应式布局）
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 计算居中偏移量：固定7列，左右留边距
  const gridContentWidth = DESKTOP_COLS * gridSize; // 7列的宽度
  const horizontalPadding = Math.max(20, (containerWidth - gridContentWidth) / 2); // 左右边距，居中

  // 吸附到网格
  const snapToGrid = (pos: DesktopPosition): DesktopPosition => {
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize,
    };
  };

  // 检查位置是否被占用
  const isPositionOccupied = (pos: DesktopPosition, excludeId?: string): boolean => {
    return currentItems.some(item => {
      if (item.id === excludeId) return false;
      const snappedPos = snapToGrid(item.position);
      return snappedPos.x === pos.x && snappedPos.y === pos.y;
    });
  };

  // 找到最近的空闲位置
  const findNearestFreePosition = (pos: DesktopPosition, excludeId?: string): DesktopPosition => {
    const snapped = snapToGrid(pos);
    if (!isPositionOccupied(snapped, excludeId)) return snapped;

    // 螺旋搜索空闲位置
    for (let distance = 1; distance < 20; distance++) {
      for (let dx = -distance; dx <= distance; dx++) {
        for (let dy = -distance; dy <= distance; dy++) {
          if (Math.abs(dx) === distance || Math.abs(dy) === distance) {
            const testPos = {
              x: snapped.x + dx * gridSize,
              y: snapped.y + dy * gridSize,
            };
            if (testPos.x >= 0 && testPos.y >= 0 && !isPositionOccupied(testPos, excludeId)) {
              return testPos;
            }
          }
        }
      }
    }
    return snapped;
  };

  // 处理项目拖拽开始
  const handleItemMouseDown = (e: React.MouseEvent, itemId: string) => {
    if (e.button !== 0) return; // 只处理左键
    e.stopPropagation();

    const isSelected = selectedIds.includes(itemId);
    if (!isSelected && !e.shiftKey && !e.ctrlKey) {
      onSelectionChange([itemId]);
    } else if (e.ctrlKey && !isSelected) {
      onSelectionChange([...selectedIds, itemId]);
    } else if (e.ctrlKey && isSelected) {
      onSelectionChange(selectedIds.filter(id => id !== itemId));
      return;
    } else if (!isSelected) {
      onSelectionChange([...selectedIds, itemId]);
    }

    setIsDragging(true);
    setDragItemId(itemId);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  // 处理拖拽移动 - 支持拖入文件夹
  useEffect(() => {
    if (!isDragging || !dragStartPos || !dragItemId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPos = { x: e.clientX, y: e.clientY };
      setDragCurrentPos(newPos);
      
      // 检测是否超过拖拽阈值
      if (dragStartPos) {
        const deltaX = Math.abs(newPos.x - dragStartPos.x);
        const deltaY = Math.abs(newPos.y - dragStartPos.y);
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          setHasDragged(true);
        }
      }
      
      // 检测是否拖动到文件夹上
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const mouseY = e.clientY - rect.top + containerRef.current.scrollTop;
        
        // 查找鼠标下的文件夹（排除已选中的项目）
        // 需要考虑偏移量
        const gridContentWidth = DESKTOP_COLS * gridSize;
        const hPadding = Math.max(20, (containerRef.current.clientWidth - gridContentWidth) / 2);
        
        const targetFolder = currentItems.find(item => {
          if (item.type !== 'folder' || selectedIds.includes(item.id)) return false;
          const folderX = hPadding + item.position.x;
          const folderY = TOP_OFFSET + item.position.y;
          return mouseX >= folderX && mouseX <= folderX + ICON_SIZE &&
                 mouseY >= folderY && mouseY <= folderY + ICON_SIZE;
        });
        
        setDropTargetFolderId(targetFolder?.id || null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // 如果有目标文件夹，将选中项目移入文件夹
      if (dropTargetFolderId && selectedIds.length > 0) {
        const updatedItems = items.map(item => {
          if (item.id === dropTargetFolderId && item.type === 'folder') {
            const folder = item as DesktopFolderItem;
            // 添加选中的非文件夹项目到文件夹
            const newItemIds = [...folder.itemIds];
            selectedIds.forEach(id => {
              const selectedItem = items.find(i => i.id === id);
              if (selectedItem && selectedItem.type !== 'folder' && !newItemIds.includes(id)) {
                newItemIds.push(id);
              }
            });
            return { ...folder, itemIds: newItemIds, updatedAt: Date.now() };
          }
          return item;
        });
        onItemsChange(updatedItems);
        onSelectionChange([]);
      } else if (dragStartPos && dragCurrentPos && hasDragged) {
        const deltaX = dragCurrentPos.x - dragStartPos.x;
        const deltaY = dragCurrentPos.y - dragStartPos.y;

        // 多选拖动时保持相对位置关系
        // 找到拖动的基准项目（被点击的那个）
        const baseItem = items.find(i => i.id === dragItemId);
        if (!baseItem) return;
        
        // 计算基准项目的新位置并吸附到网格
        const baseNewPos = {
          x: Math.max(0, baseItem.position.x + deltaX),
          y: Math.max(0, baseItem.position.y + deltaY),
        };
        const baseSnappedPos = snapToGrid(baseNewPos);
        
        // 计算实际的偏移量（吸附后的）
        const actualDeltaX = baseSnappedPos.x - baseItem.position.x;
        const actualDeltaY = baseSnappedPos.y - baseItem.position.y;

        // 更新所有选中项目的位置，保持相对位置不变
        const updatedItems = items.map(item => {
          if (selectedIds.includes(item.id)) {
            return {
              ...item,
              position: {
                x: Math.max(0, item.position.x + actualDeltaX),
                y: Math.max(0, item.position.y + actualDeltaY),
              },
              updatedAt: Date.now(),
            };
          }
          return item;
        });
        onItemsChange(updatedItems);
      }

      setIsDragging(false);
      setDragStartPos(null);
      setDragCurrentPos(null);
      setDragItemId(null);
      setDropTargetFolderId(null);
      // 如果发生了拖拽，设置 justDragged 标志，延迟清除
      if (hasDragged) {
        setJustDragged(true);
        setTimeout(() => setJustDragged(false), 100);
      }
      setHasDragged(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartPos, dragCurrentPos, dragItemId, selectedIds, items, onItemsChange, currentItems, dropTargetFolderId]);

  // 处理双击
  const handleItemDoubleClick = (item: DesktopItem) => {
    if (item.type === 'image') {
      onImageDoubleClick(item as DesktopImageItem);
    } else {
      onFolderDoubleClick(item as DesktopFolderItem);
    }
  };

  // 处理选区开始
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    
    // 清除选中
    if (!e.shiftKey && !e.ctrlKey) {
      onSelectionChange([]);
    }
    
    // 开始选区
    const rect = containerRef.current!.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsSelecting(true);
    setSelectionBox({ start: pos, end: pos });
  };

  // 处理选区移动
  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSelectionBox(prev => prev ? {
        ...prev,
        end: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
      } : null);
    };

    const handleMouseUp = () => {
      if (selectionBox && containerRef.current) {
        // 计算选区内的项目
        const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
        const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
        const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
        const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);
        
        // 计算偏移量
        const gridContentWidth = DESKTOP_COLS * gridSize;
        const hPadding = Math.max(20, (containerRef.current.clientWidth - gridContentWidth) / 2);

        const selectedInBox = currentItems.filter(item => {
          const centerX = hPadding + item.position.x + ICON_SIZE / 2;
          const centerY = TOP_OFFSET + item.position.y + ICON_SIZE / 2;
          return centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY;
        }).map(item => item.id);

        onSelectionChange(selectedInBox);
      }
      setIsSelecting(false);
      setSelectionBox(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, selectionBox, currentItems, onSelectionChange]);

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent, itemId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 右键点击项目时自动选中该项目
    if (itemId && !selectedIds.includes(itemId)) {
      onSelectionChange([itemId]);
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemId,
    });
  };

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // 新建文件夹
  const handleCreateFolder = () => {
    const pos = contextMenu ? { x: contextMenu.x - 100, y: contextMenu.y - 100 } : { x: 50, y: 50 };
    const snappedPos = findNearestFreePosition(pos);
    
    const newFolder: DesktopFolderItem = {
      id: generateId(),
      type: 'folder',
      name: '新建文件夹',
      position: snappedPos,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      itemIds: [],
      color: theme.colors.accent,
    };
    
    onItemsChange([...items, newFolder]);
    setContextMenu(null);
  };

  // 创建叠放（将选中的图片叠放在一起）
  const handleCreateStack = () => {
    // 只能叠放图片
    const imageIds = selectedIds.filter(id => {
      const item = items.find(i => i.id === id);
      return item?.type === 'image';
    });
    
    if (imageIds.length < 2) {
      setContextMenu(null);
      return;
    }
    
    // 找到第一个选中项目的位置作为叠放位置
    const firstItem = items.find(i => i.id === imageIds[0]);
    const stackPos = firstItem ? firstItem.position : { x: 100, y: 100 };
    
    const newStack: DesktopStackItem = {
      id: generateId(),
      type: 'stack',
      name: `叠放 (${imageIds.length})`,
      position: stackPos,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      itemIds: imageIds,
      isExpanded: false,
    };
    
    onItemsChange([...items, newStack]);
    onSelectionChange([newStack.id]);
    setContextMenu(null);
  };

  // 展开/收起叠放
  const handleToggleStack = (stackId: string) => {
    const updatedItems = items.map(item => {
      if (item.id === stackId && item.type === 'stack') {
        return {
          ...item,
          isExpanded: !(item as DesktopStackItem).isExpanded,
          updatedAt: Date.now(),
        };
      }
      return item;
    });
    onItemsChange(updatedItems);
  };

  // 解散叠放
  const handleUnstack = (stackId: string) => {
    const stack = items.find(i => i.id === stackId) as DesktopStackItem | undefined;
    if (!stack) return;
    
    // 为叠放中的项目分配新位置
    let newItems = items.filter(i => i.id !== stackId);
    let offsetX = 0;
    let offsetY = 0;
    
    stack.itemIds.forEach((itemId, index) => {
      const basePos = { x: stack.position.x + offsetX, y: stack.position.y + offsetY };
      const freePos = findNearestFreePosition(basePos, itemId);
      
      newItems = newItems.map(item => 
        item.id === itemId 
          ? { ...item, position: freePos, updatedAt: Date.now() }
          : item
      );
      
      offsetX += gridSize;
      if (offsetX >= gridSize * 3) {
        offsetX = 0;
        offsetY += gridSize;
      }
    });
    
    onItemsChange(newItems);
    onSelectionChange([]);
    setContextMenu(null);
  };

  // 删除选中项目
  const handleDeleteSelected = () => {
    const updatedItems = items.filter(item => !selectedIds.includes(item.id));
    // 同时从文件夹中移除引用
    const cleanedItems = updatedItems.map(item => {
      if (item.type === 'folder') {
        return {
          ...item,
          itemIds: (item as DesktopFolderItem).itemIds.filter(id => !selectedIds.includes(id)),
        };
      }
      return item;
    });
    onItemsChange(cleanedItems);
    onSelectionChange([]);
    setContextMenu(null);
  };

  // 复制选中项目
  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(item => selectedIds.includes(item.id));
    setClipboard({ items: selectedItems, action: 'copy' });
  }, [selectedIds, items]);

  // 剪切选中项目
  const handleCut = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(item => selectedIds.includes(item.id));
    setClipboard({ items: selectedItems, action: 'cut' });
  }, [selectedIds, items]);

  // 粘贴项目
  const handlePaste = useCallback(() => {
    if (!clipboard || clipboard.items.length === 0) return;
    
    const pastePos = contextMenu 
      ? { x: contextMenu.x - 100, y: contextMenu.y - 100 } 
      : { x: 50, y: 50 };
    
    let newItems = [...items];
    let offsetX = 0;
    let offsetY = 0;
    
    clipboard.items.forEach((item, index) => {
      const basePos = { x: pastePos.x + offsetX, y: pastePos.y + offsetY };
      const freePos = findNearestFreePosition(basePos);
      
      if (clipboard.action === 'copy') {
        // 复制：创建新项目
        const newItem: DesktopItem = {
          ...item,
          id: generateId(),
          name: item.name + ' - 副本',
          position: freePos,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        newItems.push(newItem);
      } else {
        // 剪切：移动项目位置
        newItems = newItems.map(i => 
          i.id === item.id 
            ? { ...i, position: freePos, updatedAt: Date.now() } 
            : i
        );
      }
      
      offsetX += gridSize;
      if (offsetX >= gridSize * 3) {
        offsetX = 0;
        offsetY += gridSize;
      }
    });
    
    onItemsChange(newItems);
    
    // 剪切后清空剪贴板
    if (clipboard.action === 'cut') {
      setClipboard(null);
    }
    
    setContextMenu(null);
  }, [clipboard, items, contextMenu, gridSize, findNearestFreePosition, onItemsChange]);

  // 从文件夹中移出项目
  const handleMoveOutOfFolder = useCallback(() => {
    if (!openFolderId || selectedIds.length === 0) return;
    
    const updatedItems = items.map(item => {
      if (item.id === openFolderId && item.type === 'folder') {
        const folder = item as DesktopFolderItem;
        return {
          ...folder,
          itemIds: folder.itemIds.filter(id => !selectedIds.includes(id)),
          updatedAt: Date.now(),
        };
      }
      return item;
    });
    
    onItemsChange(updatedItems);
    onSelectionChange([]);
    setContextMenu(null);
  }, [openFolderId, selectedIds, items, onItemsChange, onSelectionChange]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查当前焦点是否在输入框、文本域或其他可编辑元素中
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement ||
                            activeElement instanceof HTMLTextAreaElement ||
                            activeElement?.getAttribute('contenteditable') === 'true' ||
                            activeElement?.closest('[contenteditable="true"]');
      
      // 如果焦点在输入框中，不处理桌面快捷键
      if (isInputFocused) return;
      
      // 检查焦点是否在桌面区域内（或者没有特定焦点）
      const isDesktopFocused = !activeElement || 
                               activeElement === document.body ||
                               containerRef.current?.contains(activeElement);
      
      if (!isDesktopFocused) return;
      
      // 如果正在编辑名称，只处理 Escape
      if (editingItemId) {
        if (e.key === 'Escape') {
          setEditingItemId(null);
        }
        return;
      }
      
      // Delete 删除
      if (e.key === 'Delete' && selectedIds.length > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
      
      // F2 重命名
      if (e.key === 'F2' && selectedIds.length === 1) {
        e.preventDefault();
        const item = items.find(i => i.id === selectedIds[0]);
        if (item) {
          setEditingItemId(item.id);
          setEditingName(item.name);
        }
      }
      
      // Ctrl+C 复制
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      
      // Ctrl+X 剪切
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        handleCut();
      }
      
      // Ctrl+V 粘贴
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      
      // Ctrl+A 全选
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        onSelectionChange(currentItems.map(item => item.id));
      }
      
      // Escape 取消选中
      if (e.key === 'Escape') {
        onSelectionChange([]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, items, editingItemId, handleCopy, handleCut, handlePaste, currentItems, onSelectionChange]);

  // 计算拖拽偏移
  const getDragOffset = () => {
    if (!isDragging || !dragStartPos || !dragCurrentPos) return { x: 0, y: 0 };
    return {
      x: dragCurrentPos.x - dragStartPos.x,
      y: dragCurrentPos.y - dragStartPos.y,
    };
  };

  const dragOffset = getDragOffset();

  // 获取当前选中的单个图片项目（只有在没有拖拽时才显示预览）
  const selectedImageItem = (() => {
    if (selectedIds.length !== 1 || isDragging || isSelecting || hasDragged || justDragged) return null;
    const item = currentItems.find(i => i.id === selectedIds[0]);
    if (item?.type !== 'image') return null;
    return item as DesktopImageItem;
  })();

  // 下载图片
  const handleDownloadImage = async (imageItem: DesktopImageItem) => {
    const url = imageItem.imageUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${imageItem.name}-${timestamp}.png`;
    
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto select-none"
      style={{
        backgroundColor: theme.colors.bgPrimary,
        backgroundImage: `radial-gradient(${theme.colors.border} 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        WebkitUserSelect: 'none',
        userSelect: 'none',
        padding: '16px', // 边距优化
      }}
      onMouseDown={handleContainerMouseDown}
      onContextMenu={(e) => handleContextMenu(e)}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* 搜索框和操作按钮 */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* 隐藏文件名按钮 */}
        <button
          onClick={() => setHideFileNames(!hideFileNames)}
          className={`px-3 py-2 text-xs font-medium rounded-xl backdrop-blur-xl border transition-all ${
            hideFileNames
              ? 'bg-indigo-500/30 border-indigo-500/50 text-indigo-200'
              : 'bg-black/50 border-white/20 text-gray-400 hover:text-white hover:border-white/30'
          }`}
          title={hideFileNames ? '显示文件名' : '隐藏文件名'}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {hideFileNames ? '👁️ 显示文件名' : '👁️‍🗨️ 隐藏文件名'}
        </button>
        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索图片或文件夹..."
            className="w-64 px-4 py-2 pl-10 text-sm bg-black/50 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            onMouseDown={(e) => e.stopPropagation()}
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* 搜索结果提示 */}
        {searchQuery && (
          <div className="absolute top-full right-0 mt-2 text-xs text-gray-400 text-right">
            找到 {currentItems.length} 个结果
          </div>
        )}
      </div>
      {/* 公告区域 - 左上角（不在文件夹内时显示） */}
      {!openFolderId && (
        <div className="absolute top-4 left-4 z-20 max-w-sm">
          <div className="px-4 py-3 rounded-xl bg-indigo-500/20 backdrop-blur-xl border border-indigo-500/30">
            <div className="flex items-start gap-2">
              <span className="text-lg">📢</span>
              <div className="text-xs text-indigo-200">
                {/* 公告内容可在此编辑 */}
                <p className="font-medium text-indigo-100">欢迎使用企鹅艾洛魔法世界！</p>
                <p className="mt-1 opacity-80">单击图片查看预览，拖拽整理位置，右上角可搜索。</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 面包屑导航（在文件夹内时显示） */}
      {openFolderId && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10">
          <button
            onClick={onFolderClose}
            className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回桌面
          </button>
          <span className="text-gray-500">/</span>
          <span className="text-sm font-medium text-white">
            {items.find(i => i.id === openFolderId)?.name || '文件夹'}
          </span>
        </div>
      )}

      {/* 桌面项目 */}
      {currentItems.map(item => {
        const isSelected = selectedIds.includes(item.id);
        const offset = isSelected && isDragging ? dragOffset : { x: 0, y: 0 };
        const isDropTarget = dropTargetFolderId === item.id;
        
        return (
          <div
            key={item.id}
            className={`absolute select-none cursor-pointer transition-transform ${
              isDragging && isSelected ? 'z-50' : 'z-10'
            }`}
            style={{
              left: horizontalPadding + item.position.x + offset.x,
              top: TOP_OFFSET + item.position.y + offset.y,
              width: ICON_SIZE,
            }}
            onMouseDown={(e) => handleItemMouseDown(e, item.id)}
            onDoubleClick={() => handleItemDoubleClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item.id)}
          >
            {/* 图标容器 */}
            <div
              className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-offset-transparent shadow-xl scale-105'
                  : isDropTarget
                  ? 'ring-2 ring-green-500 scale-110 shadow-2xl'
                  : 'hover:scale-105 hover:shadow-lg'
              }`}
              style={{
                backgroundColor: item.type === 'folder' 
                  ? isDropTarget 
                    ? 'rgba(34, 197, 94, 0.3)' 
                    : `${(item as DesktopFolderItem).color || theme.colors.accent}20`
                  : 'rgba(0,0,0,0.4)',
                borderColor: isSelected ? theme.colors.primary : isDropTarget ? '#22c55e' : 'transparent',
                ringColor: isSelected ? theme.colors.primary : 'transparent',
              }}
            >
              {item.type === 'image' ? (
                <img
                  src={(item as DesktopImageItem).imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NjY2NjYiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIvPjxwb2x5bGluZSBwb2ludHM9IjIxIDE1IDEwIDkgMyAxNSIvPjwvc3ZnPg==';
                  }}
                />
              ) : item.type === 'stack' ? (
                // Mac风格叠放效果
                <div className="w-full h-full relative">
                  {(() => {
                    const stack = item as DesktopStackItem;
                    const stackImages = stack.itemIds
                      .slice(0, 4) // 最多显示4张
                      .map(id => items.find(i => i.id === id) as DesktopImageItem)
                      .filter(Boolean);
                    
                    return stackImages.map((img, idx) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt={img.name}
                        className="absolute rounded-lg object-cover"
                        style={{
                          width: '70%',
                          height: '70%',
                          left: `${8 + idx * 6}%`,
                          top: `${8 + idx * 6}%`,
                          transform: `rotate(${(idx - 1.5) * 5}deg)`,
                          zIndex: idx,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                        draggable={false}
                      />
                    ));
                  })()}
                  {/* 叠放数量标记 */}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10">
                    {(item as DesktopStackItem).itemIds.length}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {(item as DesktopFolderItem).icon || '📁'}
                </div>
              )}
              
              {/* 选中标记 */}
              {isSelected && (
                <div 
                  className="absolute inset-0 border-2 rounded-xl pointer-events-none"
                  style={{ borderColor: theme.colors.primary }}
                />
              )}
            </div>
            
            {/* 名称标签 - 支持编辑 */}
            {editingItemId === item.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  if (editingName.trim() && onRenameItem) {
                    onRenameItem(item.id, editingName.trim());
                  }
                  setEditingItemId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editingName.trim() && onRenameItem) {
                      onRenameItem(item.id, editingName.trim());
                    }
                    setEditingItemId(null);
                  } else if (e.key === 'Escape') {
                    setEditingItemId(null);
                  }
                }}
                autoFocus
                className="mt-1 w-full text-xs text-center bg-black/60 border border-white/30 rounded px-1 py-0.5 outline-none focus:border-indigo-500"
                style={{ color: theme.colors.textPrimary }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              // 文件夹和叠放始终显示名称，图片根据 hideFileNames 控制
              (item.type === 'folder' || item.type === 'stack' || !hideFileNames) && (
                <p 
                  className="mt-1 text-xs text-center truncate px-1 cursor-default"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {item.name}
                </p>
              )
            )}
          </div>
        );
      })}

      {/* 选区框 */}
      {isSelecting && selectionBox && (
        <div
          className="absolute border-2 rounded pointer-events-none z-40"
          style={{
            left: Math.min(selectionBox.start.x, selectionBox.end.x),
            top: Math.min(selectionBox.start.y, selectionBox.end.y),
            width: Math.abs(selectionBox.end.x - selectionBox.start.x),
            height: Math.abs(selectionBox.end.y - selectionBox.start.y),
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}20`,
          }}
        />
      )}

      {/* 选中图片时的操作浮层 - 动态方向 */}
      {selectedImageItem && !contextMenu && (() => {
        // 计算浮层显示方向
        const PREVIEW_WIDTH = 320; // 预览卡片宽度
        const PREVIEW_HEIGHT = 360; // 预览卡片高度
        const cWidth = containerRef.current?.clientWidth || 800;
        const cHeight = containerRef.current?.clientHeight || 600;
        const itemX = horizontalPadding + selectedImageItem.position.x;
        const itemY = TOP_OFFSET + selectedImageItem.position.y;
        
        // 计算各方向的可用空间
        const spaceRight = cWidth - (itemX + ICON_SIZE);
        const spaceLeft = itemX;
        const spaceBottom = cHeight - (itemY + ICON_SIZE);
        const spaceTop = itemY;
        
        // 选择最佳方向
        let posStyle: React.CSSProperties = {};
        
        if (spaceRight >= PREVIEW_WIDTH + 20) {
          // 右侧空间足够
          posStyle = {
            left: itemX + ICON_SIZE + 12,
            top: Math.max(8, Math.min(itemY - 60, cHeight - PREVIEW_HEIGHT - 8)),
          };
        } else if (spaceLeft >= PREVIEW_WIDTH + 20) {
          // 左侧空间足够
          posStyle = {
            left: itemX - PREVIEW_WIDTH - 12,
            top: Math.max(8, Math.min(itemY - 60, cHeight - PREVIEW_HEIGHT - 8)),
          };
        } else if (spaceBottom >= PREVIEW_HEIGHT + 20) {
          // 下方空间足够
          posStyle = {
            left: Math.max(8, Math.min(itemX - PREVIEW_WIDTH / 2 + ICON_SIZE / 2, cWidth - PREVIEW_WIDTH - 8)),
            top: itemY + ICON_SIZE + 12,
          };
        } else if (spaceTop >= PREVIEW_HEIGHT + 20) {
          // 上方空间足够
          posStyle = {
            left: Math.max(8, Math.min(itemX - PREVIEW_WIDTH / 2 + ICON_SIZE / 2, cWidth - PREVIEW_WIDTH - 8)),
            top: itemY - PREVIEW_HEIGHT - 12,
          };
        } else {
          // 默认右侧，但进行边界纠正
          posStyle = {
            left: Math.min(itemX + ICON_SIZE + 12, cWidth - PREVIEW_WIDTH - 8),
            top: Math.max(8, Math.min(itemY - 60, cHeight - PREVIEW_HEIGHT - 8)),
          };
        }
        
        return (
          <div
            className="absolute z-30"
            style={posStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* 毛玻璃背景卡片 */}
            <div className="bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              {/* 放大的图片预览 - 居中 */}
              <div 
                className="relative cursor-pointer group flex items-center justify-center p-4"
                onClick={() => onImagePreview?.(selectedImageItem)}
              >
                <img
                  src={selectedImageItem.imageUrl}
                  alt={selectedImageItem.name}
                  className="w-72 h-72 object-cover rounded-lg"
                  draggable={false}
                />
                {/* 悬浮放大提示 */}
                <div className="absolute inset-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <ZoomInIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              {/* 底部操作按钮 */}
              <div className="px-4 pb-4 flex items-center justify-center gap-2">
                {/* 预览 */}
                <button
                  onClick={() => onImagePreview?.(selectedImageItem)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-gray-700/80 rounded-lg hover:bg-gray-600 transition-colors"
                  title="预览大图"
                >
                  <ZoomInIcon className="w-4 h-4" />
                  <span>预览</span>
                </button>
                {/* 下载 */}
                <button
                  onClick={() => handleDownloadImage(selectedImageItem)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white font-medium rounded-lg text-xs hover:bg-indigo-500 transition-colors"
                  title="下载图片"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>下载</span>
                </button>
                {/* 再编辑 */}
                {onImageEditAgain && (
                  <button
                    onClick={() => onImageEditAgain(selectedImageItem)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white font-medium rounded-lg text-xs hover:bg-teal-500 transition-colors"
                    title="再次编辑"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>编辑</span>
                  </button>
                )}
                {/* 重新生成 */}
                {onImageRegenerate && (
                  <button
                    onClick={() => onImageRegenerate(selectedImageItem)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white font-medium rounded-lg text-xs hover:bg-orange-500 transition-colors"
                    title="重新生成"
                  >
                    <RefreshIcon className="w-4 h-4" />
                    <span>重生成</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] py-2 rounded-xl shadow-2xl border"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: theme.colors.bgSecondary,
            borderColor: theme.colors.border,
          }}
        >
          {/* 无项目时的菜单 */}
          {!contextMenu.itemId && (
            <>
              <button
                onClick={handleCreateFolder}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                style={{ color: theme.colors.textPrimary }}
              >
                📁 新建文件夹
              </button>
              {/* 选中多个图片时可以叠放 */}
              {selectedIds.length >= 2 && selectedIds.every(id => items.find(i => i.id === id)?.type === 'image') && (
                <button
                  onClick={handleCreateStack}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                  style={{ color: theme.colors.textPrimary }}
                >
                  📚 叠放选中图片 ({selectedIds.length})
                </button>
              )}
              {clipboard && clipboard.items.length > 0 && (
                <button
                  onClick={handlePaste}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                  style={{ color: theme.colors.textPrimary }}
                >
                  📋 粘贴 ({clipboard.items.length})
                </button>
              )}
            </>
          )}
          
          {/* 有选中项目时的菜单 */}
          {contextMenu.itemId && (
            <>
              {/* 叠放特有选项 */}
              {items.find(i => i.id === contextMenu.itemId)?.type === 'stack' ? (
                <>
                  <button
                    onClick={() => {
                      handleToggleStack(contextMenu.itemId!);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {(items.find(i => i.id === contextMenu.itemId) as DesktopStackItem)?.isExpanded ? '📦 收起叠放' : '📤 展开叠放'}
                  </button>
                  <button
                    onClick={() => handleUnstack(contextMenu.itemId!)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    💭 解散叠放
                  </button>
                  <div className="h-px bg-white/10 my-1" />
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const item = items.find(i => i.id === contextMenu.itemId);
                      if (item) handleItemDoubleClick(item);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {items.find(i => i.id === contextMenu.itemId)?.type === 'folder' ? '📂 打开' : '👁️ 预览'}
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  const item = items.find(i => i.id === contextMenu.itemId);
                  if (item) {
                    setEditingItemId(item.id);
                    setEditingName(item.name);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                style={{ color: theme.colors.textPrimary }}
              >
                ✏️ 重命名
              </button>
              <div className="h-px bg-white/10 my-1" />
            </>
          )}
          
          {/* 选中项目的操作 */}
          {selectedIds.length > 0 && (
            <>
              <button
                onClick={() => { handleCopy(); setContextMenu(null); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                style={{ color: theme.colors.textPrimary }}
              >
                📋 复制
              </button>
              <button
                onClick={() => { handleCut(); setContextMenu(null); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                style={{ color: theme.colors.textPrimary }}
              >
                ✂️ 剪切
              </button>
              {/* 在文件夹内时显示移出选项 */}
              {openFolderId && (
                <button
                  onClick={handleMoveOutOfFolder}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                  style={{ color: theme.colors.textPrimary }}
                >
                  📤 移出文件夹
                </button>
              )}
              {/* 选中多个图片时可以叠放 */}
              {selectedIds.length >= 2 && selectedIds.every(id => items.find(i => i.id === id)?.type === 'image') && (
                <button
                  onClick={handleCreateStack}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                  style={{ color: theme.colors.textPrimary }}
                >
                  📚 叠放选中图片 ({selectedIds.length})
                </button>
              )}
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={handleDeleteSelected}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 transition-colors text-red-400 flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                删除 ({selectedIds.length})
              </button>
            </>
          )}
        </div>
      )}
      {/* 免责声明 - 底部左侧 */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
          <p className="text-[10px] text-gray-400 leading-relaxed max-w-md">
            ⚠️ 免责声明：本站内容由 AI 模型生成，仅供学习与测试。用户请勿生成或上传色情、政治等违规内容，违者将封禁账号并上报。
          </p>
        </div>
      </div>
    </div>
  );
};

// 工具函数：从历史记录创建桌面图片项目
export const createDesktopItemFromHistory = (
  history: GenerationHistory, 
  position?: DesktopPosition
): DesktopImageItem => {
  return {
    id: `img-${history.id}-${Date.now()}`,
    type: 'image',
    name: history.prompt.slice(0, 20) + (history.prompt.length > 20 ? '...' : ''),
    position: position || { x: 50, y: 50 },
    createdAt: history.timestamp,
    updatedAt: Date.now(),
    imageUrl: history.imageUrl,
    prompt: history.prompt,
    model: history.model,
    isThirdParty: history.isThirdParty,
    historyId: history.id,
  };
};
