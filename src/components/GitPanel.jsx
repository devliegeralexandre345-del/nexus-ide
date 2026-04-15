import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, GitCommit, Plus, Minus, Check, X, RefreshCw,
  Upload, Download, RotateCcw, ChevronDown, ChevronRight, FileCode, Trash2
} from 'lucide-react';

export default function GitPanel({ state, dispatch }) {
  const [gitStatus, setGitStatus] = useState(null);
  const [gitLog, setGitLog] = useState([]);
  const [branches, setBranches] = useState([]);
  const [commitMsg, setCommitMsg] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!state.projectPath) return;
    setLoading(true);
    try {
      const res = await window.lorica.git.status(state.projectPath);
      const data = res?.data || res;
      setGitStatus(data);

      if (data?.is_repo) {
        const logRes = await window.lorica.git.log(state.projectPath, 20);
        setGitLog(logRes?.data || logRes || []);
        const brRes = await window.lorica.git.branches(state.projectPath);
        setBranches(brRes?.data || brRes || []);
      }
    } catch (e) {
      console.error('Git refresh failed:', e);
    }
    setLoading(false);
  }, [state.projectPath]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStage = async (filePath) => {
    await window.lorica.git.stage(state.projectPath, filePath);
    refresh();
  };

  const handleUnstage = async (filePath) => {
    await window.lorica.git.unstage(state.projectPath, filePath);
    refresh();
  };

  const handleStageAll = async () => {
    await window.lorica.git.stageAll(state.projectPath);
    refresh();
  };

  const handleDiscard = async (filePath) => {
    await window.lorica.git.discard(state.projectPath, filePath);
    refresh();
    dispatch({ type: 'ADD_TOAST', toast: { type: 'info', message: `Discarded changes: ${filePath.split(/[/\\]/).pop()}` } });
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'warning', message: 'Enter a commit message' } });
      return;
    }
    const res = await window.lorica.git.commit(state.projectPath, commitMsg);
    if (res?.success !== false) {
      setCommitMsg('');
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: 'Committed!', duration: 2000 } });
      refresh();
    } else {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: res?.error || 'Commit failed' } });
    }
  };

  const handlePush = async () => {
    dispatch({ type: 'ADD_TOAST', toast: { type: 'info', message: 'Pushing...', duration: 5000 } });
    const res = await window.lorica.git.push(state.projectPath);
    if (res?.success !== false) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: 'Pushed!', duration: 2000 } });
      refresh();
    } else {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: res?.error || 'Push failed' } });
    }
  };

  const handlePull = async () => {
    dispatch({ type: 'ADD_TOAST', toast: { type: 'info', message: 'Pulling...', duration: 5000 } });
    const res = await window.lorica.git.pull(state.projectPath);
    if (res?.success !== false) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: 'Pulled!', duration: 2000 } });
      refresh();
    } else {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: res?.error || 'Pull failed' } });
    }
  };

  const handleCheckout = async (branch) => {
    const res = await window.lorica.git.checkout(state.projectPath, branch);
    if (res?.success !== false) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Switched to ${branch}` } });
      refresh();
    } else {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: res?.error || 'Checkout failed' } });
    }
  };

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showGit', value: false });

  if (!gitStatus?.is_repo) {
    return (
      <div className="h-full flex flex-col bg-lorica-surface">
        <div className="flex items-center justify-between px-3 py-2 border-b border-lorica-border">
          <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Git</span>
          <button onClick={close} className="text-lorica-textDim hover:text-lorica-text"><X size={14} /></button>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-lorica-textDim">
          <div className="text-center">
            <GitBranch size={28} className="mx-auto mb-2 opacity-20" />
            <div className="opacity-50">{state.projectPath ? 'Not a git repository' : 'Open a project first'}</div>
          </div>
        </div>
      </div>
    );
  }

  const staged = gitStatus.files.filter(f => f.staged);
  const unstaged = gitStatus.files.filter(f => !f.staged);

  const statusColor = (status) => {
    switch (status) {
      case 'M': return 'text-amber-400';
      case 'A': case '?': return 'text-green-400';
      case 'D': return 'text-red-400';
      case 'R': return 'text-blue-400';
      default: return 'text-lorica-textDim';
    }
  };

  return (
    <div className="h-full flex flex-col bg-lorica-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lorica-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Git</span>
          <span className="text-[10px] text-lorica-accent font-mono">{gitStatus.branch}</span>
          {gitStatus.ahead > 0 && <span className="text-[9px] text-green-400">↑{gitStatus.ahead}</span>}
          {gitStatus.behind > 0 && <span className="text-[9px] text-red-400">↓{gitStatus.behind}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={refresh} className={`p-1 text-lorica-textDim hover:text-lorica-accent rounded ${loading ? 'animate-spin' : ''}`} title="Refresh">
            <RefreshCw size={12} />
          </button>
          <button onClick={close} className="p-1 text-lorica-textDim hover:text-lorica-text"><X size={14} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Commit input */}
        <div className="px-2 py-2 border-b border-lorica-border">
          <div className="flex items-center gap-1">
            <input
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleCommit()}
              placeholder="Commit message (Ctrl+Enter)"
              className="flex-1 bg-lorica-bg border border-lorica-border rounded px-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent placeholder:text-lorica-textDim/50"
            />
            <button onClick={handleCommit} className="p-1.5 bg-lorica-accent/20 text-lorica-accent rounded hover:bg-lorica-accent/30" title="Commit">
              <Check size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <button onClick={handlePull} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-lorica-textDim hover:text-lorica-text bg-lorica-bg rounded border border-lorica-border hover:border-lorica-accent/30 transition-colors">
              <Download size={10} /> Pull
            </button>
            <button onClick={handlePush} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-lorica-textDim hover:text-lorica-text bg-lorica-bg rounded border border-lorica-border hover:border-lorica-accent/30 transition-colors">
              <Upload size={10} /> Push
            </button>
          </div>
        </div>

        {/* Staged */}
        {staged.length > 0 && (
          <div className="border-b border-lorica-border">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Staged ({staged.length})</span>
            </div>
            {staged.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 text-xs hover:bg-lorica-panel/40 group">
                <span className={`text-[10px] font-mono w-3 ${statusColor(f.status)}`}>{f.status}</span>
                <span className="flex-1 truncate text-lorica-text">{f.path.split(/[/\\]/).pop()}</span>
                <button onClick={() => handleUnstage(f.path)} className="opacity-0 group-hover:opacity-100 p-0.5 text-lorica-textDim hover:text-amber-400" title="Unstage">
                  <Minus size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Unstaged */}
        {unstaged.length > 0 && (
          <div className="border-b border-lorica-border">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Changes ({unstaged.length})</span>
              <button onClick={handleStageAll} className="text-[10px] text-lorica-textDim hover:text-green-400" title="Stage all">
                <Plus size={12} />
              </button>
            </div>
            {unstaged.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 text-xs hover:bg-lorica-panel/40 group">
                <span className={`text-[10px] font-mono w-3 ${statusColor(f.status)}`}>{f.status}</span>
                <span className="flex-1 truncate text-lorica-textDim group-hover:text-lorica-text">{f.path.split(/[/\\]/).pop()}</span>
                <button onClick={() => handleStage(f.path)} className="opacity-0 group-hover:opacity-100 p-0.5 text-lorica-textDim hover:text-green-400" title="Stage">
                  <Plus size={12} />
                </button>
                <button onClick={() => handleDiscard(f.path)} className="opacity-0 group-hover:opacity-100 p-0.5 text-lorica-textDim hover:text-red-400" title="Discard">
                  <RotateCcw size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {staged.length === 0 && unstaged.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-lorica-textDim opacity-50">
            Working tree clean ✓
          </div>
        )}

        {/* Branches */}
        <div className="border-b border-lorica-border">
          <button onClick={() => setShowBranches(!showBranches)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-lorica-textDim hover:text-lorica-text uppercase tracking-wider font-semibold">
            {showBranches ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <GitBranch size={10} /> Branches ({branches.length})
          </button>
          {showBranches && branches.map((b, i) => (
            <button
              key={i}
              onClick={() => !b.current && handleCheckout(b.name)}
              className={`w-full flex items-center gap-1.5 px-4 py-0.5 text-xs transition-colors ${
                b.current ? 'text-lorica-accent' : 'text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/40'
              }`}
            >
              {b.current && <Check size={10} />}
              <span className={b.current ? '' : 'ml-3.5'}>{b.name}</span>
            </button>
          ))}
        </div>

        {/* Log */}
        <div>
          <button onClick={() => setShowLog(!showLog)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-lorica-textDim hover:text-lorica-text uppercase tracking-wider font-semibold">
            {showLog ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <GitCommit size={10} /> History
          </button>
          {showLog && gitLog.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-1 text-[11px] hover:bg-lorica-panel/30 border-l-2 border-lorica-border hover:border-lorica-accent/30">
              <span className="text-lorica-accent/50 font-mono flex-shrink-0">{entry.short_hash}</span>
              <div className="flex-1 min-w-0">
                <div className="text-lorica-text truncate">{entry.message}</div>
                <div className="text-[9px] text-lorica-textDim">{entry.author} · {entry.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

