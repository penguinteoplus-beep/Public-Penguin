
import React, { useState, useMemo, useRef } from 'react';
import type { CreativeIdea } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { LibraryIcon } from './icons/LibraryIcon';
import { EditIcon } from './icons/EditIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';
import { useTheme } from '../contexts/ThemeContext';


interface CreativeLibraryProps {
  ideas: CreativeIdea[];
  onBack: () => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onEdit: (idea: CreativeIdea) => void;
  onUse: (idea: CreativeIdea) => void;
  onExport: () => void;
  onImport: () => void;
  onReorder: (reorderedIdeas: CreativeIdea[]) => void;
}

type FilterType = 'all' | 'simple' | 'bp' | 'plus';

export const CreativeLibrary: React.FC<CreativeLibraryProps> = ({ ideas, onBack, onAdd, onDelete, onEdit, onUse, onExport, onImport, onReorder }) => {
  const { themeName } = useTheme();
  const isLight = themeName === 'light';
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const dragItem = useRef<CreativeIdea | null>(null);
  const dragOverItem = useRef<CreativeIdea | null>(null);

  const filteredIdeas = useMemo(() => {
    return ideas
      .filter(idea => {
        if (filter === 'all') return true;
        if (filter === 'simple') return !idea.isSmart && !idea.isSmartPlus && !idea.isBP;
        if (filter === 'bp') return !!idea.isBP;
        if (filter === 'plus') return !!idea.isSmartPlus;
        return true;
      })
      .filter(idea =>
        idea.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [ideas, searchTerm, filter]);

  const handleDragSort = () => {
    if (!dragItem.current || !dragOverItem.current || dragItem.current.id === dragOverItem.current.id) {
      return;
    }

    const newIdeas = [...ideas];
    const dragItemIndex = ideas.findIndex(i => i.id === dragItem.current!.id);
    const dragOverItemIndex = ideas.findIndex(i => i.id === dragOverItem.current!.id);

    if (dragItemIndex === -1 || dragOverItemIndex === -1) return;

    const [draggedItem] = newIdeas.splice(dragItemIndex, 1);
    newIdeas.splice(dragOverItemIndex, 0, draggedItem);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    onReorder(newIdeas);
  };

  const filterButtons: { key: FilterType, label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'simple', label: '基础' },
    { key: 'bp', label: 'BP' },
    { key: 'plus', label: 'PLUS' },
  ];

  return (
    <div 
      className="flex flex-col w-full h-full p-6 animate-fade-in"
      style={{ background: isLight ? 'rgba(248,250,252,0.95)' : 'rgba(3,7,18,0.5)' }}
    >
      <header 
        className="flex-shrink-0 flex items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
      >
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
            创意库
          </h1>
          <p className="text-sm mt-1" style={{ color: isLight ? '#64748b' : '#9ca3af' }}>管理和使用您的创意灵感</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm shadow-md transition-colors"
            style={{
              background: isLight ? '#e2e8f0' : '#374151',
              color: isLight ? '#0f172a' : 'white'
            }}
          >
            <UploadIcon className="w-5 h-5" />
            <span>导入</span>
          </button>
           <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm shadow-md transition-colors"
            style={{
              background: isLight ? '#e2e8f0' : '#374151',
              color: isLight ? '#0f172a' : 'white'
            }}
          >
            <DownloadIcon className="w-5 h-5" />
            <span>导出</span>
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg text-sm shadow-md hover:bg-teal-500 transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>新增</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm border transition-colors"
            style={{
              background: isLight ? 'rgba(0,0,0,0.05)' : '#1f2937',
              color: isLight ? '#0f172a' : 'white',
              borderColor: isLight ? 'rgba(0,0,0,0.15)' : '#4b5563'
            }}
          >
            &larr; 返回
          </button>
        </div>
      </header>

      <div className="flex-shrink-0 flex items-center justify-between gap-4 py-4">
        <div className="relative flex-grow">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: isLight ? '#94a3b8' : '#6b7280' }} />
          <input
            type="text"
            placeholder="搜索标题..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            style={{
              background: isLight ? 'rgba(255,255,255,0.9)' : '#1f2937',
              borderColor: isLight ? 'rgba(0,0,0,0.15)' : '#374151',
              color: isLight ? '#0f172a' : 'white'
            }}
          />
        </div>
        <div 
          className="flex items-center gap-2 border rounded-lg p-1"
          style={{
            background: isLight ? 'rgba(255,255,255,0.9)' : '#1f2937',
            borderColor: isLight ? 'rgba(0,0,0,0.15)' : '#374151'
          }}
        >
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${
                filter === key
                  ? key === 'bp' ? 'bg-yellow-600 text-white' : 'bg-indigo-600 text-white'
                  : ''
              }`}
              style={filter !== key ? { color: isLight ? '#475569' : '#d1d5db' } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      <main className="flex-grow overflow-y-auto py-2 pr-2 -mr-2 custom-scrollbar">
        {filteredIdeas.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredIdeas.map(idea => (
              <div 
                key={idea.id} 
                className="group relative rounded-lg overflow-hidden cursor-grab aspect-square border transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1"
                style={{
                  background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(31,41,55,0.7)',
                  borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(55,65,81,0.5)'
                }}
                title={idea.title}
                draggable
                onDragStart={() => (dragItem.current = idea)}
                onDragEnter={() => (dragOverItem.current = idea)}
                onDragEnd={handleDragSort}
                onDragOver={(e) => e.preventDefault()}
                >
                  <img src={idea.imageUrl} alt={idea.title} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 p-1 pointer-events-none" />
                  <div className="absolute inset-0" onClick={() => onUse(idea)} style={{ cursor: 'pointer' }}></div>
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                      <h3 className="font-semibold text-white truncate">{idea.title}</h3>
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ cursor: 'default' }}>
                     <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onEdit(idea);
                        }}
                        className="p-1.5 bg-gray-900/70 text-gray-300 hover:text-white hover:bg-indigo-600 rounded-full backdrop-blur-sm"
                        aria-label={`编辑 '${idea.title}'`}
                        style={{ cursor: 'pointer' }}
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if(window.confirm(`确认删除 "${idea.title}"?`)) {
                                onDelete(idea.id); 
                            }
                        }}
                        className="p-1.5 bg-gray-900/70 text-gray-300 hover:text-white hover:bg-red-600 rounded-full backdrop-blur-sm"
                        aria-label={`删除 '${idea.title}'`}
                        style={{ cursor: 'pointer' }}
                    >
                        <XCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                   <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <div className="flex gap-1">
                        {idea.isBP && (
                            <div className="px-2 py-0.5 bg-yellow-600/80 text-white text-xs font-bold rounded-full backdrop-blur-sm pointer-events-none shadow-lg shadow-yellow-500/20">
                                BP
                            </div>
                        )}
                        {idea.isSmartPlus && (
                            <div className="px-2 py-0.5 bg-teal-600/80 text-white text-xs font-bold rounded-full backdrop-blur-sm pointer-events-none shadow-lg shadow-teal-500/20">
                                PLUS
                            </div>
                        )}
                        {idea.isSmart && !idea.isBP && (
                             <div className="px-2 py-0.5 bg-purple-600/80 text-white text-xs font-bold rounded-full backdrop-blur-sm pointer-events-none">
                                SMART
                            </div>
                        )}
                      </div>
                      {/* 价格显示 */}
                      {idea.cost !== undefined && idea.cost > 0 && (
                        <div className="px-2 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded-full backdrop-blur-sm pointer-events-none flex items-center gap-0.5">
                          <span>🪨</span>
                          <span>{idea.cost}</span>
                        </div>
                      )}
                    </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center flex flex-col items-center justify-center h-full" style={{ color: isLight ? '#64748b' : '#6b7280' }}>
            <LibraryIcon className="w-16 h-16 mb-4" style={{ color: isLight ? '#cbd5e1' : '#374151' }}/>
            <h2 className="text-2xl font-semibold" style={{ color: isLight ? '#475569' : '#6b7280' }}>
              {searchTerm || filter !== 'all' ? '未找到创意' : '创意库是空的'}
            </h2>
            <p className="mt-2">
              {searchTerm || filter !== 'all' ? '请尝试其他关键词或筛选条件' : '点击 "新增" 来添加您的第一个灵感！'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
