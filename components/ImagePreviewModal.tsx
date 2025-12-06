import React, { useState, useRef } from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { ZoomOutIcon } from './icons/ZoomOutIcon';
import { ResetZoomIcon } from './icons/ResetZoomIcon';
import { DownloadIcon } from './icons/DownloadIcon';


interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const [transform, setTransform] = useState({ scale: 1, posX: 0, posY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setTransform(t => ({...t, scale: Math.min(t.scale + 0.2, 5)}));
  const handleZoomOut = () => setTransform(t => ({...t, scale: Math.max(t.scale - 0.2, 0.5)}));
  const handleReset = () => setTransform({ scale: 1, posX: 0, posY: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setTransform(t => ({...t, scale: Math.max(0.5, Math.min(t.scale + delta, 5))}));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || transform.scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
        x: e.clientX - transform.posX,
        y: e.clientY - transform.posY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || transform.scale <= 1) return;
    e.preventDefault();
    setTransform(prev => ({
        ...prev,
        posX: e.clientX - dragStart.x,
        posY: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `ai-generated-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image Preview"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      
      <div 
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        <img 
            src={imageUrl} 
            alt="Image Preview" 
            className="block w-auto h-auto max-w-full max-h-full object-contain"
            style={{ 
                transform: `translate(${transform.posX}px, ${transform.posY}px) scale(${transform.scale})`,
                cursor: transform.scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            draggable={false}
            onMouseDown={handleMouseDown}
        />
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900/70 backdrop-blur-sm rounded-full p-2 flex items-center gap-2 shadow-lg z-10">
          <button onClick={handleZoomOut} className="p-2 text-white rounded-full hover:bg-gray-700 transition-colors" aria-label="缩小 / Zoom out"><ZoomOutIcon className="w-6 h-6" /></button>
          <button onClick={handleReset} className="p-2 text-white rounded-full hover:bg-gray-700 transition-colors" aria-label="重置缩放 / Reset zoom"><ResetZoomIcon className="w-6 h-6" /></button>
          <button onClick={handleZoomIn} className="p-2 text-white rounded-full hover:bg-gray-700 transition-colors" aria-label="放大 / Zoom in"><ZoomInIcon className="w-6 h-6" /></button>
          <div className="w-px h-6 bg-gray-600 mx-1"></div>
          <button onClick={handleDownload} className="p-2 text-white rounded-full hover:bg-gray-700 transition-colors" aria-label="下载 / Download"><DownloadIcon className="w-6 h-6" /></button>
      </div>
        
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white bg-gray-800/70 rounded-full p-1 hover:bg-gray-700 transition-colors z-10"
        aria-label="关闭预览 / Close preview"
      >
        <XCircleIcon className="w-8 h-8" />
      </button>
    </div>
  );
};