import React, { useState, useMemo } from 'react';
import { GitCompare, X, ArrowRight } from 'lucide-react';

function computeDiff(textA, textB) {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const maxLen = Math.max(linesA.length, linesB.length);
  const result = [];

  for (let i = 0; i < maxLen; i++) {
    const a = linesA[i] ?? '';
    const b = linesB[i] ?? '';
    if (a === b) {
      result.push({ type: 'same', lineA: i + 1, lineB: i + 1, contentA: a, contentB: b });
    } else if (i >= linesA.length) {
      result.push({ type: 'added', lineA: null, lineB: i + 1, contentA: '', contentB: b });
    } else if (i >= linesB.length) {
      result.push({ type: 'removed', lineA: i + 1, lineB: null, contentA: a, contentB: '' });
    } else {
      result.push({ type: 'changed', lineA: i + 1, lineB: i + 1, contentA: a, contentB: b });
    }
  }
  return result;
}

export default function DiffViewer({ state, dispatch }) {
  const [fileAIndex, setFileAIndex] = useState(0);
  const [fileBIndex, setFileBIndex] = useState(Math.min(1, state.openFiles.length - 1));

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showDiffViewer', value: false });

  const fileA = state.openFiles[fileAIndex];
  const fileB = state.openFiles[fileBIndex];
  const diff = useMemo(() => {
    if (!fileA || !fileB) return [];
    return computeDiff(fileA.content || '', fileB.content || '');
  }, [fileA, fileB]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, changed = 0;
    diff.forEach((d) => {
      if (d.type === 'added') added++;
      else if (d.type === 'removed') removed++;
      else if (d.type === 'changed') changed++;
    });
    return { added, removed, changed };
  }, [diff]);

  const lineColors = {
    same: '',
    added: 'bg-green-900/20',
    removed: 'bg-red-900/20',
    changed: 'bg-yellow-900/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={close}>
      <div className="w-[90vw] max-w-[1000px] max-h-[85vh] bg-lorica-panel border border-lorica-border rounded-xl shadow-2xl flex flex-col animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-lorica-border">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-lorica-accent" />
            <span className="text-sm font-semibold text-lorica-text">Diff Viewer</span>
          </div>
          <button onClick={close} className="text-lorica-textDim hover:text-lorica-text"><X size={16} /></button>
        </div>

        {state.openFiles.length < 2 ? (
          <div className="p-8 text-center text-lorica-textDim text-sm">Open at least 2 files to compare</div>
        ) : (
          <>
            {/* File selectors */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-lorica-border/50">
              <select
                value={fileAIndex}
                onChange={(e) => setFileAIndex(Number(e.target.value))}
                className="bg-lorica-bg border border-lorica-border rounded px-2 py-1 text-xs text-lorica-text outline-none"
              >
                {state.openFiles.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
              </select>
              <ArrowRight size={14} className="text-lorica-textDim" />
              <select
                value={fileBIndex}
                onChange={(e) => setFileBIndex(Number(e.target.value))}
                className="bg-lorica-bg border border-lorica-border rounded px-2 py-1 text-xs text-lorica-text outline-none"
              >
                {state.openFiles.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
              </select>
              <div className="flex-1" />
              <span className="text-[10px] text-green-400">+{stats.added}</span>
              <span className="text-[10px] text-red-400">-{stats.removed}</span>
              <span className="text-[10px] text-yellow-400">~{stats.changed}</span>
            </div>

            {/* Diff content */}
            <div className="flex-1 overflow-auto font-mono text-[11px]">
              <div className="flex">
                {/* Left (file A) */}
                <div className="flex-1 border-r border-lorica-border/50">
                  {diff.map((d, i) => (
                    <div key={i} className={`flex ${lineColors[d.type]} ${d.type === 'removed' || d.type === 'changed' ? 'border-l-2 border-l-red-500/50' : ''}`}>
                      <span className="w-10 text-right pr-2 text-lorica-textDim/50 select-none flex-shrink-0">
                        {d.lineA || ''}
                      </span>
                      <span className="flex-1 px-2 whitespace-pre overflow-hidden">
                        {d.contentA}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Right (file B) */}
                <div className="flex-1">
                  {diff.map((d, i) => (
                    <div key={i} className={`flex ${lineColors[d.type]} ${d.type === 'added' || d.type === 'changed' ? 'border-l-2 border-l-green-500/50' : ''}`}>
                      <span className="w-10 text-right pr-2 text-lorica-textDim/50 select-none flex-shrink-0">
                        {d.lineB || ''}
                      </span>
                      <span className="flex-1 px-2 whitespace-pre overflow-hidden">
                        {d.contentB}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
