import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileCode, Folder } from 'lucide-react';

export default function FilePalette({ state, dispatch, onFileOpen }) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Load file list on mount
  useEffect(() => {
    if (!state.projectPath) { setLoading(false); return; }
    (async () => {
      try {
        const res = await window.lorica.search.listProjectFiles(state.projectPath);
        const data = res?.data || res || [];
        setFiles(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('File list failed:', e);
      }
      setLoading(false);
    })();
  }, [state.projectPath]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return files.slice(0, 50);
    const q = query.toLowerCase();
    return files
      .map(f => {
        const name = f.name.toLowerCase();
        const rel = f.relative.toLowerCase();
        // Score: exact name match > name contains > path contains
        let score = 0;
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else if (rel.includes(q)) score = 40;
        else {
          // Fuzzy: check if all chars appear in order
          let qi = 0;
          for (let i = 0; i < rel.length && qi < q.length; i++) {
            if (rel[i] === q[qi]) qi++;
          }
          if (qi === q.length) score = 20;
        }
        return { ...f, score };
      })
      .filter(f => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [files, query]);

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showFilePalette', value: false });

  const handleSelect = (file) => {
    close();
    onFileOpen(file.path);
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered.length > 0) {
      handleSelect(filtered[Math.min(selectedIdx, filtered.length - 1)]);
    }
  };

  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => {
    if (listRef.current?.children[selectedIdx]) {
      listRef.current.children[selectedIdx].scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={close}>
      <div className="w-[550px] bg-lorica-panel border border-lorica-border rounded-xl shadow-2xl overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-lorica-border">
          <FileCode size={16} className="text-lorica-accent" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Go to file..."
            className="flex-1 bg-transparent text-sm text-lorica-text outline-none placeholder:text-lorica-textDim/50"
          />
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1">
          {loading ? (
            <div className="px-4 py-6 text-center text-xs text-lorica-textDim animate-pulse">Loading files...</div>
          ) : filtered.length > 0 ? (
            filtered.map((file, i) => (
              <button
                key={file.path}
                className={`w-full flex items-center gap-3 px-4 py-1.5 text-xs transition-colors ${
                  i === selectedIdx ? 'bg-lorica-accent/15 text-lorica-accent' : 'text-lorica-text hover:bg-lorica-accent/10'
                }`}
                onClick={() => handleSelect(file)}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <FileCode size={14} className="opacity-50 flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">{highlightName(file.name, query)}</div>
                  <div className="text-[10px] text-lorica-textDim truncate">{file.relative}</div>
                </div>
                <span className="text-[9px] text-lorica-textDim/50 flex-shrink-0">{file.extension}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-xs text-lorica-textDim">No files found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function highlightName(name, query) {
  if (!query) return name;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <span className="text-lorica-accent font-bold">{name.slice(idx, idx + query.length)}</span>
      {name.slice(idx + query.length)}
    </>
  );
}

