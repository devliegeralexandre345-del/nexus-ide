import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, Replace, ChevronDown, ChevronRight, FileCode, CaseSensitive, ArrowDownUp } from 'lucide-react';

export default function GlobalSearch({ state, dispatch, onFileOpen }) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState({});
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim() || !state.projectPath) return;
    setLoading(true);
    try {
      const res = await window.lorica.search.searchInFiles(state.projectPath, q, caseSensitive, 500);
      if (res && res.success !== false) {
        const data = res.data || res;
        setResults(data);
        // Auto-expand first 5 files
        const expanded = {};
        const files = [...new Set((data.matches || []).map(m => m.path))];
        files.slice(0, 5).forEach(f => { expanded[f] = true; });
        setExpandedFiles(expanded);
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
    setLoading(false);
  }, [state.projectPath, caseSensitive]);

  const handleInput = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 300);
    } else {
      setResults(null);
    }
  };

  const handleReplace = async (matchPath, matchLine) => {
    // Single file replace not implemented yet — use replace all
    dispatch({ type: 'ADD_TOAST', toast: { type: 'info', message: 'Use Replace All for now', duration: 2000 } });
  };

  const handleReplaceAll = async () => {
    if (!query || !state.projectPath) return;
    const res = await window.lorica.search.replaceInFiles(state.projectPath, query, replacement, caseSensitive);
    if (res && res.data !== undefined) {
      const count = res.data;
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${count} remplacement${count > 1 ? 's' : ''} effectué${count > 1 ? 's' : ''}`, duration: 3000 } });
      doSearch(query);
    }
  };

  const toggleFile = (path) => {
    setExpandedFiles(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const goToMatch = (match) => {
    onFileOpen(match.path);
    // TODO: scroll to line after file opens
  };

  // Group matches by file
  const grouped = {};
  if (results?.matches) {
    for (const m of results.matches) {
      if (!grouped[m.path]) grouped[m.path] = { name: m.name, preview: m.preview, matches: [] };
      grouped[m.path].matches.push(m);
    }
  }

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showSearch', value: false });

  return (
    <div className="h-full flex flex-col bg-lorica-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lorica-border">
        <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Search</span>
        <button onClick={close} className="text-lorica-textDim hover:text-lorica-text"><X size={14} /></button>
      </div>

      {/* Search input */}
      <div className="px-2 py-2 space-y-1.5 border-b border-lorica-border">
        <div className="flex items-center gap-1">
          <div className="flex-1 flex items-center bg-lorica-bg border border-lorica-border rounded px-2 py-1 focus-within:border-lorica-accent">
            <Search size={12} className="text-lorica-textDim mr-1.5 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
              placeholder="Search in files..."
              className="flex-1 bg-transparent text-xs text-lorica-text outline-none placeholder:text-lorica-textDim/50"
            />
          </div>
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`p-1 rounded transition-colors ${caseSensitive ? 'bg-lorica-accent/20 text-lorica-accent' : 'text-lorica-textDim hover:text-lorica-text'}`}
            title="Case sensitive"
          >
            <CaseSensitive size={14} />
          </button>
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1 rounded transition-colors ${showReplace ? 'bg-lorica-accent/20 text-lorica-accent' : 'text-lorica-textDim hover:text-lorica-text'}`}
            title="Replace"
          >
            <ArrowDownUp size={14} />
          </button>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1">
            <div className="flex-1 flex items-center bg-lorica-bg border border-lorica-border rounded px-2 py-1 focus-within:border-lorica-accent">
              <Replace size={12} className="text-lorica-textDim mr-1.5 flex-shrink-0" />
              <input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Replace with..."
                className="flex-1 bg-transparent text-xs text-lorica-text outline-none placeholder:text-lorica-textDim/50"
              />
            </div>
            <button
              onClick={handleReplaceAll}
              className="px-2 py-1 text-[10px] bg-lorica-accent/20 text-lorica-accent rounded hover:bg-lorica-accent/30 transition-colors"
            >
              All
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-3 py-4 text-center text-xs text-lorica-textDim animate-pulse">Searching...</div>
        )}

        {results && !loading && (
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] text-lorica-textDim">
              {results.total} résultat{results.total !== 1 ? 's' : ''} dans {results.files_searched} fichier{results.files_searched !== 1 ? 's' : ''}
              {results.truncated && ' (tronqué)'}
            </div>

            {Object.entries(grouped).map(([filePath, group]) => (
              <div key={filePath}>
                <button
                  onClick={() => toggleFile(filePath)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-lorica-text hover:bg-lorica-panel/60 transition-colors"
                >
                  {expandedFiles[filePath] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <FileCode size={12} className="text-lorica-accent" />
                  <span className="truncate flex-1 text-left">{group.preview}</span>
                  <span className="text-[10px] text-lorica-textDim bg-lorica-bg px-1.5 rounded">{group.matches.length}</span>
                </button>

                {expandedFiles[filePath] && group.matches.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => goToMatch(m)}
                    className="w-full flex items-start gap-2 px-4 pl-8 py-0.5 text-[11px] text-lorica-textDim hover:bg-lorica-panel/40 hover:text-lorica-text transition-colors"
                  >
                    <span className="text-lorica-accent/60 flex-shrink-0 w-8 text-right">{m.line}</span>
                    <span className="truncate text-left font-mono">
                      {highlightMatch(m.text, query, caseSensitive).map((part, idx) => (
                        part.highlight ? (
                          <span key={idx} className="bg-lorica-accent/30 text-lorica-accent rounded px-0.5">
                            {part.text}
                          </span>
                        ) : (
                          <span key={idx}>{part.text}</span>
                        )
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {!results && !loading && (
          <div className="px-3 py-8 text-center text-xs text-lorica-textDim">
            <Search size={24} className="mx-auto mb-2 opacity-20" />
            <div className="opacity-40">Tapez pour rechercher dans le projet</div>
          </div>
        )}
      </div>
    </div>
  );
}

function highlightMatch(text, query, caseSensitive) {
  if (!query) return [{ text, highlight: false }];
  const flags = caseSensitive ? 'g' : 'gi';
  try {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
      }
      parts.push({ text: match[0], highlight: true });
      lastIndex = regex.lastIndex;
      // Éviter une boucle infinie si la regex correspond à une chaîne vide
      if (match.index === regex.lastIndex) regex.lastIndex++;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }
    return parts;
  } catch {
    return [{ text, highlight: false }];
  }
}

