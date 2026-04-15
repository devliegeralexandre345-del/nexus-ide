import React, { useRef, useState, memo } from 'react';
import { X } from 'lucide-react';
import { getFileIcon } from '../utils/languages';

const TabBar = memo(function TabBar({ files, activeIndex, onSelect, onClose, dispatch }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);
  const dragRef = useRef(null);

  if (files.length === 0) return null;

  const handleDragStart = (e, i) => {
    setDragIdx(i);
    dragRef.current = i;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(i));
  };

  const handleDragOver = (e, i) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (i !== dropIdx) setDropIdx(i);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = dragRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      dispatch({ type: 'REORDER_TABS', from: fromIndex, to: toIndex });
    }
    setDragIdx(null);
    setDropIdx(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
    dragRef.current = null;
  };

  return (
    <div className="flex items-center gap-0.5 px-1 py-1 bg-lorica-surface/50 border-b border-lorica-border/50 overflow-x-auto">
      {files.map((file, i) => (
        <div
          key={file.path}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
          className={`lorica-tab flex items-center gap-1.5 px-3 py-1 text-xs cursor-pointer min-w-0 group transition-all rounded-lg ${
            i === activeIndex
              ? 'active bg-lorica-bg text-lorica-text shadow-sm'
              : 'text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/30'
          } ${dragIdx === i ? 'opacity-30 scale-95' : ''} ${dropIdx === i && dragIdx !== i ? 'ring-1 ring-lorica-accent/40' : ''}`}
          onClick={() => onSelect(i)}
        >
          <span className="text-[10px] flex-shrink-0">{getFileIcon(file.extension)}</span>
          <span className="truncate max-w-[120px]">{file.name}</span>
          {file.dirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-lorica-accent flex-shrink-0 animate-pulse" />
          )}
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-lorica-border/50 transition-all flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); onClose(i); }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
});

export default TabBar;
