import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Code2, Search, X } from 'lucide-react';
import { getSnippetsForExtension } from '../utils/snippets';

export default function SnippetPalette({ activeFile, dispatch, onInsert }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const ext = activeFile?.extension || '';
  const allSnippets = useMemo(() => {
    const snippets = getSnippetsForExtension(ext);
    return Object.values(snippets);
  }, [ext]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allSnippets;
    const q = query.toLowerCase();
    return allSnippets.filter(s =>
      s.prefix.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
    );
  }, [allSnippets, query]);

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showSnippets', value: false });

  const insertSnippet = (snippet) => {
    const expanded = snippet.body.replace(/\$\{\d+:?([^}]*)}/g, '$1');
    if (onInsert) onInsert(expanded);
    close();
    dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Inserted: ${snippet.label}`, duration: 1500 } });
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered.length > 0) insertSnippet(filtered[Math.min(selectedIdx, filtered.length - 1)]);
  };

  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => {
    if (listRef.current?.children[selectedIdx]) {
      listRef.current.children[selectedIdx].scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 lorica-modal-overlay" onClick={close}>
      <div className="w-[520px] bg-lorica-panel border border-lorica-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-lorica-border">
          <Code2 size={16} className="text-lorica-accent" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Snippets for .${ext || '?'}...`}
            className="flex-1 bg-transparent text-sm text-lorica-text outline-none placeholder:text-lorica-textDim/50"
          />
          <span className="text-[10px] text-lorica-textDim">{filtered.length}</span>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-lorica-textDim">
              {allSnippets.length === 0 ? `No snippets for .${ext}` : 'No matches'}
            </div>
          ) : (
            filtered.map((snippet, i) => (
              <button
                key={snippet.prefix}
                className={`w-full flex items-start gap-3 px-4 py-2 transition-colors ${
                  i === selectedIdx ? 'bg-lorica-accent/10' : 'hover:bg-lorica-panel/80'
                }`}
                onClick={() => insertSnippet(snippet)}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    i === selectedIdx ? 'bg-lorica-accent/20 text-lorica-accent' : 'bg-lorica-bg text-lorica-textDim'
                  }`}>
                    {snippet.prefix}
                  </kbd>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className={`text-xs ${i === selectedIdx ? 'text-lorica-accent' : 'text-lorica-text'}`}>
                    {snippet.label}
                  </div>
                  <pre className="text-[10px] text-lorica-textDim mt-0.5 font-mono truncate leading-tight opacity-60">
                    {snippet.body.split('\n')[0].replace(/\$\{\d+:?([^}]*)}/g, '$1')}
                  </pre>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
