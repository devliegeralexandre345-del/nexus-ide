// src/components/ApplyCodeModal.jsx
//
// Modal that previews an Agent-suggested code change and, on confirm,
// writes the file through the lorica bridge. Reused for every "Apply"
// button the Agent Copilot exposes on a fenced code block.
//
// Behaviour:
//   • Shows the (inferred or manually set) target path — editable by the user
//   • Loads the current file content asynchronously
//   • Renders a simple before/after side-by-side preview (no char-level diff
//     for now — a clear visual comparison is enough for approval)
//   • Apply → fs.writeFile + OPEN_FILE so the editor reflects the change
//
// The parent (AgentCopilot) holds the modal state and passes onConfirm/onCancel.

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, FileText, AlertTriangle, FolderOpen } from 'lucide-react';

export default function ApplyCodeModal({
  code,
  initialPath,
  projectPath,
  onConfirm,
  onCancel,
}) {
  const [path, setPath] = useState(initialPath || '');
  const [oldContent, setOldContent] = useState(null); // null = not yet loaded; string = loaded
  const [loadError, setLoadError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [fileExists, setFileExists] = useState(null); // true | false | null (unknown)
  const pathInputRef = useRef(null);

  // Reload current file whenever the path changes.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setOldContent(null);
      setLoadError(null);
      setFileExists(null);
      if (!path || !path.trim()) return;
      try {
        const r = await window.lorica.fs.readFile(path);
        if (cancelled) return;
        if (r.success) {
          setOldContent(r.data.content || '');
          setFileExists(true);
        } else {
          setOldContent('');
          setFileExists(false);
          setLoadError(r.error || null);
        }
      } catch (e) {
        if (cancelled) return;
        setOldContent('');
        setFileExists(false);
        setLoadError(e.message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [path]);

  useEffect(() => {
    const t = setTimeout(() => pathInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const handlePickFile = async () => {
    try {
      // Uses the tauri-plugin-dialog bridge exposed by loricaBridge.
      const picked = await window.lorica?.dialog?.openFile?.();
      if (picked && typeof picked === 'string') setPath(picked);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[apply] file picker failed:', e);
    }
  };

  const handleApply = async () => {
    if (!path.trim() || applying) return;
    setApplying(true);
    try {
      await onConfirm({ path: path.trim(), newContent: code });
    } finally {
      setApplying(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); return; }
    // Ctrl/Cmd+Enter to apply — standard modal shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  const newLineCount = code.split('\n').length;
  const oldLineCount = oldContent ? oldContent.split('\n').length : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-[min(1200px,95vw)] h-[min(780px,90vh)] bg-lorica-panel border border-lorica-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-lorica-border shrink-0">
          <Check size={14} className="text-lorica-accent" />
          <span className="text-xs font-semibold text-lorica-text">Apply code change</span>
          <span className="text-[10px] text-lorica-textDim ml-auto">
            {fileExists === false ? 'New file' : fileExists === true ? 'Existing file' : 'Checking…'}
          </span>
          <button
            onClick={onCancel}
            className="p-1 rounded text-lorica-textDim hover:text-lorica-text transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Path bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-lorica-border shrink-0 bg-lorica-bg/40">
          <FileText size={11} className="text-lorica-textDim shrink-0" />
          <input
            ref={pathInputRef}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Absolute path to the target file"
            spellCheck={false}
            className="flex-1 bg-transparent text-xs text-lorica-text outline-none font-mono placeholder:text-lorica-textDim/50"
          />
          <button
            onClick={handlePickFile}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-lorica-textDim hover:text-lorica-accent hover:bg-lorica-accent/10 transition-colors"
            title="Browse for a file"
          >
            <FolderOpen size={10} /> Browse
          </button>
        </div>

        {/* Warning if no path */}
        {!path.trim() && (
          <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-yellow-400 bg-yellow-500/5 border-b border-lorica-border">
            <AlertTriangle size={11} /> Choose a target file before applying.
          </div>
        )}

        {/* Diff body */}
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-px bg-lorica-border/50">
          <Pane
            label={fileExists === false ? 'Current — (new file)' : 'Current'}
            lineCount={oldLineCount}
            content={oldContent === null ? '' : oldContent}
            muted={fileExists === false || !path.trim()}
            error={loadError}
            loading={path.trim() && oldContent === null && !loadError}
          />
          <Pane
            label="Proposed"
            lineCount={newLineCount}
            content={code}
            accent
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-lorica-border shrink-0 bg-lorica-bg/40">
          <span className="text-[10px] text-lorica-textDim">
            <kbd className="px-1 py-0.5 rounded bg-lorica-border/50 font-mono text-[9px]">Esc</kbd> annule ·{' '}
            <kbd className="px-1 py-0.5 rounded bg-lorica-border/50 font-mono text-[9px]">Ctrl+↵</kbd> applique
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs text-lorica-textDim hover:text-lorica-text hover:bg-lorica-border/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!path.trim() || applying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lorica-accent/20 border border-lorica-accent/40 text-lorica-accent text-xs hover:bg-lorica-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={12} /> {applying ? 'Applying…' : fileExists === false ? 'Create file' : 'Apply change'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pane({ label, content, lineCount, loading, error, muted, accent }) {
  return (
    <div className="bg-lorica-panel flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-lorica-border/60 text-[10px] text-lorica-textDim shrink-0 uppercase tracking-widest">
        <span className={accent ? 'text-lorica-accent font-semibold' : muted ? 'text-lorica-textDim/60' : ''}>
          {label}
        </span>
        <span className="ml-auto">{lineCount} lines</span>
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-snug whitespace-pre">
        {error ? (
          <span className="text-red-400">Error: {error}</span>
        ) : loading ? (
          <span className="text-lorica-textDim italic">Loading…</span>
        ) : content === '' && muted ? (
          <span className="text-lorica-textDim italic">(file will be created)</span>
        ) : (
          <span className={accent ? 'text-lorica-text' : 'text-lorica-textDim'}>{content}</span>
        )}
      </div>
    </div>
  );
}
