import React, { useState, useEffect } from 'react';
import {
  Hash, FileCode, Circle, Square, Triangle, Folder,
  ChevronDown, ChevronRight, Code, Tag, Zap, BookOpen,
  X, Search
} from 'lucide-react';

// Mock outline data - in real implementation, this would be generated from the active file
const generateOutline = (fileContent, language) => {
  if (!fileContent) return [];

  const lines = fileContent.split('\n');
  const outline = [];
  let lastIndent = 0;
  let id = 1;

  // Simple parsing for demonstration
  lines.forEach((line, lineNumber) => {
    const trimmed = line.trim();
    
    // Detect functions in various languages
    if (language === 'js' || language === 'jsx' || language === 'ts' || language === 'tsx') {
      const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?(function|const|let|var)\s+(\w+)\s*[=\(]/);
      if (funcMatch) {
        outline.push({
          id: id++,
          name: funcMatch[4],
          type: 'function',
          line: lineNumber + 1,
          icon: Zap,
          indent: 0,
        });
      }
      
      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        outline.push({
          id: id++,
          name: classMatch[1],
          type: 'class',
          line: lineNumber + 1,
          icon: Code,
          indent: 0,
        });
      }
    }
    
    if (language === 'python') {
      const defMatch = trimmed.match(/^def\s+(\w+)/);
      if (defMatch) {
        outline.push({
          id: id++,
          name: defMatch[1],
          type: 'function',
          line: lineNumber + 1,
          icon: Zap,
          indent: 0,
        });
      }
      
      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        outline.push({
          id: id++,
          name: classMatch[1],
          type: 'class',
          line: lineNumber + 1,
          icon: Code,
          indent: 0,
        });
      }
    }
    
    // Simple heuristic for other languages
    if (trimmed.includes('function') || trimmed.includes('def ') || trimmed.includes('fn ')) {
      outline.push({
        id: id++,
        name: `Function at line ${lineNumber + 1}`,
        type: 'function',
        line: lineNumber + 1,
        icon: Zap,
        indent: 0,
      });
    }
  });

  // If no symbols found, add a placeholder
  if (outline.length === 0) {
    return [
      { id: 1, name: 'No symbols found', type: 'info', line: 1, icon: FileCode, indent: 0 },
    ];
  }

  return outline;
};

function OutlineItem({ item, onNavigate, expandedItems, toggleExpand }) {
  const Icon = item.icon || FileCode;
  
  let iconColor = 'text-lorica-textDim';
  if (item.type === 'function') iconColor = 'text-blue-400';
  if (item.type === 'class') iconColor = 'text-purple-400';
  if (item.type === 'method') iconColor = 'text-green-400';
  if (item.type === 'property') iconColor = 'text-yellow-400';
  if (item.type === 'interface') iconColor = 'text-pink-400';

  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);

  return (
    <div
      className={`pl-${item.indent * 4} hover:bg-lorica-border/30 cursor-pointer`}
      onClick={() => {
        if (hasChildren) {
          toggleExpand(item.id);
        } else if (item.line && item.type !== 'info') {
          onNavigate(item.line);
        }
      }}
    >
      <div className="flex items-center gap-2 py-1.5 px-3 text-xs text-lorica-text hover:text-lorica-textDim">
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={10} className="text-lorica-textDim" />
          ) : (
            <ChevronRight size={10} className="text-lorica-textDim" />
          )
        ) : (
          <div className="w-3" />
        )}
        <Icon size={10} className={iconColor} />
        <span className="truncate flex-1">{item.name}</span>
        {item.line && (
          <span className="text-[9px] text-lorica-textDim font-mono bg-lorica-border/30 px-1.5 py-0.5 rounded">
            {item.line}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {item.children.map(child => (
            <OutlineItem
              key={child.id}
              item={child}
              onNavigate={onNavigate}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OutlinePanel({ state, dispatch, activeFile }) {
  const [outline, setOutline] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('position'); // 'position' | 'name' | 'type'

  useEffect(() => {
    if (activeFile?.content) {
      const extension = activeFile.name.split('.').pop();
      const generated = generateOutline(activeFile.content, extension);
      setOutline(generated);
      // Auto-expand first level
      setExpandedItems(new Set(generated.filter(item => item.type === 'class' || item.type === 'interface').map(item => item.id)));
    } else {
      setOutline([]);
    }
  }, [activeFile]);

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const navigateToLine = (line) => {
    if (activeFile) {
      // In a real implementation, this would scroll the editor to the line
      console.log(`Navigate to line ${line} in ${activeFile.name}`);
      dispatch({ type: 'ADD_TOAST', toast: { type: 'info', message: `Navigated to line ${line}` } });
    }
  };

  const filteredOutline = outline.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const sortedOutline = [...filteredOutline].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'type') return a.type.localeCompare(b.type);
    return a.line - b.line; // position
  });

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showOutline', value: false });

  return (
    <div className="h-full flex flex-col bg-lorica-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lorica-border">
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-lorica-accent" />
          <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Outline</span>
        </div>
        <button onClick={close} className="text-lorica-textDim hover:text-lorica-text">
          <X size={14} />
        </button>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 border-b border-lorica-border/50 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search size={10} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-lorica-textDim" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-lorica-bg border border-lorica-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent placeholder:text-lorica-textDim/50"
          />
        </div>

        {/* Sort controls */}
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('position')}
            className={`flex-1 py-1 text-[10px] rounded transition-colors ${
              sortBy === 'position'
                ? 'bg-lorica-accent/20 text-lorica-accent border border-lorica-accent/30'
                : 'bg-lorica-border text-lorica-textDim hover:text-lorica-text'
            }`}
          >
            Position
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`flex-1 py-1 text-[10px] rounded transition-colors ${
              sortBy === 'name'
                ? 'bg-lorica-accent/20 text-lorica-accent border border-lorica-accent/30'
                : 'bg-lorica-border text-lorica-textDim hover:text-lorica-text'
            }`}
          >
            Name
          </button>
          <button
            onClick={() => setSortBy('type')}
            className={`flex-1 py-1 text-[10px] rounded transition-colors ${
              sortBy === 'type'
                ? 'bg-lorica-accent/20 text-lorica-accent border border-lorica-accent/30'
                : 'bg-lorica-border text-lorica-textDim hover:text-lorica-text'
            }`}
          >
            Type
          </button>
        </div>
      </div>

      {/* File info */}
      {activeFile && (
        <div className="px-3 py-2 border-b border-lorica-border/50 flex items-center gap-2">
          <FileCode size={10} className="text-lorica-accent" />
          <span className="text-[10px] text-lorica-textDim truncate flex-1">{activeFile.name}</span>
          <span className="text-[9px] bg-lorica-accent/10 text-lorica-accent px-1.5 py-0.5 rounded">
            {outline.length} symbols
          </span>
        </div>
      )}

      {/* Outline list */}
      <div className="flex-1 overflow-auto">
        {sortedOutline.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-lorica-textDim p-4">
            <BookOpen size={24} className="mb-2 opacity-30" />
            <div className="text-xs text-center">
              {search ? 'No symbols match your search' : 'No outline available'}
            </div>
          </div>
        ) : (
          <div className="py-1">
            {sortedOutline.map(item => (
              <OutlineItem
                key={item.id}
                item={item}
                onNavigate={navigateToLine}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-lorica-border/50 text-[9px] text-lorica-textDim flex items-center justify-between">
        <span>
          {sortedOutline.length} {sortedOutline.length === 1 ? 'symbol' : 'symbols'}
        </span>
        <button
          onClick={() => setExpandedItems(new Set())}
          className="hover:text-lorica-text transition-colors"
        >
          Collapse all
        </button>
      </div>
    </div>
  );
}