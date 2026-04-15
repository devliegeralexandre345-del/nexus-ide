import React, { useState, useEffect } from 'react';
import {
  Play, Square, Bug, ChevronDown, FileCode, Terminal, X, Loader2,
  Pause, StepForward, StepBack, SkipForward, Circle, ListTree, Code2, Cpu,
  PlayCircle, Square as StopIcon, RefreshCw, Eye, EyeOff, Zap
} from 'lucide-react';
import { useDAP } from '../hooks/useDAP';

const LANGUAGES = [
  { id: 'python', name: 'Python', cmd: 'python', ext: ['.py'] },
  { id: 'javascript', name: 'Node.js', cmd: 'node', ext: ['.js', '.mjs'] },
  { id: 'typescript', name: 'TypeScript', cmd: 'ts-node', ext: ['.ts'] },
  { id: 'rust', name: 'Rust (Cargo)', cmd: 'cargo run', ext: ['.rs'] },
  { id: 'cpp', name: 'C++', cmd: 'g++', ext: ['.cpp', '.cc', '.cxx'] },
  { id: 'c', name: 'C', cmd: 'gcc', ext: ['.c'] },
  { id: 'csharp', name: 'C# (dotnet)', cmd: 'dotnet run', ext: ['.cs'] },
  { id: 'go', name: 'Go', cmd: 'go run', ext: ['.go'] },
];

const TAB_RUN = 'run';
const TAB_DEBUG = 'debug';

function RunTab({ state, activeFile, currentLang, detectedLang, language, setLanguage, args, setArgs, running, handleRun }) {
  return (
    <div className="space-y-2">
      {/* Language selector */}
      <div>
        <label className="text-[10px] text-lorica-textDim mb-1 block">Language</label>
        <select
          value={currentLang}
          onChange={e => setLanguage(e.target.value)}
          className="w-full bg-lorica-bg border border-lorica-border rounded-lg px-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent appearance-none cursor-pointer"
        >
          <option value="">Auto-detect</option>
          {LANGUAGES.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* File */}
      <div className="flex items-center gap-2 text-[10px]">
        <FileCode size={10} className="text-lorica-accent" />
        <span className="text-lorica-textDim truncate">
          {activeFile ? activeFile.name : 'No file selected'}
        </span>
        {detectedLang && !language && (
          <span className="text-lorica-accent/60 ml-auto">{detectedLang.name}</span>
        )}
      </div>

      {/* Arguments */}
      <div>
        <label className="text-[10px] text-lorica-textDim mb-1 block">Arguments</label>
        <input
          value={args}
          onChange={e => setArgs(e.target.value)}
          placeholder="Optional arguments..."
          className="w-full bg-lorica-bg border border-lorica-border rounded-lg px-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent placeholder:text-lorica-textDim/50"
        />
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={running || !currentLang}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
          running
            ? 'bg-lorica-border text-lorica-textDim'
            : !currentLang
              ? 'bg-lorica-border text-lorica-textDim cursor-not-allowed'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20'
        }`}
      >
        {running ? (
          <><Loader2 size={14} className="animate-spin" /> Running...</>
        ) : (
          <><Play size={14} /> Run {detectedLang?.name || ''}</>
        )}
      </button>
    </div>
  );
}

function DebugTab({ state, dispatch, activeFile, currentLang, detectedLang, language, setLanguage, args, setArgs }) {
  const dap = useDAP();
  const [showVariables, setShowVariables] = useState(true);
  const [showStackTrace, setShowStackTrace] = useState(true);
  const [showBreakpoints, setShowBreakpoints] = useState(true);
  
  const handleStartDebug = async () => {
    if (!activeFile && !state.projectPath) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'warning', message: 'Open a file to debug' } });
      return;
    }

    const config = {
      language: currentLang,
      program: activeFile?.path || '',
      args: args.split(' ').filter(Boolean),
      cwd: state.projectPath || undefined,
      env: {},
      stop_at_entry: false,
      console: 'integrated',
    };

    try {
      await dap.launchSession(config);
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: 'Debug session started', duration: 2000 } });
    } catch (error) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: `Debug start failed: ${error.message}` } });
    }
  };

  const handleToggleBreakpoint = (line) => {
    if (!activeFile) return;
    dap.toggleBreakpoint(activeFile.path, line);
  };

  const isDebugging = dap.debugState !== 'stopped';
  const isPaused = dap.debugState === 'paused';
  const isRunning = dap.debugState === 'running';

  return (
    <div className="space-y-3">
      {/* Debug controls */}
      <div className="flex flex-col gap-2">
        {/* Language selector */}
        <div>
          <label className="text-[10px] text-lorica-textDim mb-1 block">Language</label>
          <select
            value={currentLang}
            onChange={e => setLanguage(e.target.value)}
            className="w-full bg-lorica-bg border border-lorica-border rounded-lg px-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent appearance-none cursor-pointer"
          >
            <option value="">Auto-detect</option>
            {LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* File */}
        <div className="flex items-center gap-2 text-[10px]">
          <FileCode size={10} className="text-lorica-accent" />
          <span className="text-lorica-textDim truncate">
            {activeFile ? activeFile.name : 'No file selected'}
          </span>
          {detectedLang && !language && (
            <span className="text-lorica-accent/60 ml-auto">{detectedLang.name}</span>
          )}
        </div>

        {/* Arguments */}
        <div>
          <label className="text-[10px] text-lorica-textDim mb-1 block">Arguments</label>
          <input
            value={args}
            onChange={e => setArgs(e.target.value)}
            placeholder="Optional arguments..."
            className="w-full bg-lorica-bg border border-lorica-border rounded-lg px-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent placeholder:text-lorica-textDim/50"
          />
        </div>

        {/* Debug action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleStartDebug}
            disabled={isDebugging || !currentLang}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              isDebugging || !currentLang
                ? 'bg-lorica-border text-lorica-textDim cursor-not-allowed'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20'
            }`}
          >
            <Zap size={14} />
            {isDebugging ? 'Debugging...' : 'Start Debugging'}
          </button>
          
          <button
            onClick={() => dap.terminateSession()}
            disabled={!isDebugging}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              !isDebugging
                ? 'bg-lorica-border text-lorica-textDim cursor-not-allowed'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
            }`}
          >
            <StopIcon size={14} />
          </button>
        </div>

        {/* Debug toolbar */}
        {isDebugging && (
          <div className="flex gap-1 p-1 bg-lorica-bg/50 rounded-lg border border-lorica-border">
            <button
              onClick={() => dap.continueExecution()}
              disabled={!isPaused}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                !isPaused
                  ? 'text-lorica-textDim cursor-not-allowed'
                  : 'text-green-400 hover:bg-green-500/10'
              }`}
            >
              <PlayCircle size={12} />
              Continue (F5)
            </button>
            <button
              onClick={() => dap.stepOver()}
              disabled={!isPaused}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                !isPaused
                  ? 'text-lorica-textDim cursor-not-allowed'
                  : 'text-blue-400 hover:bg-blue-500/10'
              }`}
            >
              <StepForward size={12} />
              Step Over (F10)
            </button>
            <button
              onClick={() => dap.stepIn()}
              disabled={!isPaused}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                !isPaused
                  ? 'text-lorica-textDim cursor-not-allowed'
                  : 'text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <StepBack size={12} />
              Step In (F11)
            </button>
            <button
              onClick={() => dap.stepOut()}
              disabled={!isPaused}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                !isPaused
                  ? 'text-lorica-textDim cursor-not-allowed'
                  : 'text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              <SkipForward size={12} />
              Step Out (Shift+F11)
            </button>
            <button
              onClick={() => dap.pauseExecution()}
              disabled={!isRunning}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                !isRunning
                  ? 'text-lorica-textDim cursor-not-allowed'
                  : 'text-yellow-400 hover:bg-yellow-500/10'
              }`}
            >
              <Pause size={12} />
              Pause
            </button>
          </div>
        )}
      </div>

      {/* Debug info panels */}
      <div className="space-y-2">
        {/* Breakpoints panel */}
        <div className="bg-lorica-bg/50 rounded-lg border border-lorica-border">
          <button
            onClick={() => setShowBreakpoints(!showBreakpoints)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-lorica-textDim hover:text-lorica-text"
          >
            <div className="flex items-center gap-2">
              <Circle size={10} className="text-red-400" />
              <span>Breakpoints</span>
            </div>
            {showBreakpoints ? <ChevronDown size={12} /> : <ChevronDown size={12} className="transform -rotate-90" />}
          </button>
          {showBreakpoints && (
            <div className="px-3 py-2 border-t border-lorica-border/50 max-h-32 overflow-auto">
              {Object.entries(dap.breakpoints).length === 0 ? (
                <div className="text-[10px] text-lorica-textDim italic text-center">No breakpoints set</div>
              ) : (
                Object.entries(dap.breakpoints).map(([file, bps]) => (
                  <div key={file} className="mb-1">
                    <div className="text-[10px] text-lorica-textDim truncate">{file.split('/').pop()}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bps.map(bp => (
                        <div
                          key={bp.id}
                          className="px-2 py-0.5 text-[10px] rounded bg-red-400/10 text-red-400 border border-red-400/20"
                        >
                          Line {bp.line}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Variables panel */}
        <div className="bg-lorica-bg/50 rounded-lg border border-lorica-border">
          <button
            onClick={() => setShowVariables(!showVariables)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-lorica-textDim hover:text-lorica-text"
          >
            <div className="flex items-center gap-2">
              <Code2 size={10} className="text-green-400" />
              <span>Variables</span>
            </div>
            {showVariables ? <ChevronDown size={12} /> : <ChevronDown size={12} className="transform -rotate-90" />}
          </button>
          {showVariables && isPaused && (
            <div className="px-3 py-2 border-t border-lorica-border/50 max-h-32 overflow-auto">
              {Object.values(dap.variables).flat().length === 0 ? (
                <div className="text-[10px] text-lorica-textDim italic text-center">No variables available</div>
              ) : (
                Object.values(dap.variables).flat().map((variable, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-lorica-border/30 last:border-0">
                    <span className="text-[10px] text-lorica-text">{variable.name}</span>
                    <span className="text-[10px] text-lorica-accent font-mono">{variable.value}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Stack trace panel */}
        <div className="bg-lorica-bg/50 rounded-lg border border-lorica-border">
          <button
            onClick={() => setShowStackTrace(!showStackTrace)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-lorica-textDim hover:text-lorica-text"
          >
            <div className="flex items-center gap-2">
              <ListTree size={10} className="text-blue-400" />
              <span>Call Stack</span>
            </div>
            {showStackTrace ? <ChevronDown size={12} /> : <ChevronDown size={12} className="transform -rotate-90" />}
          </button>
          {showStackTrace && isPaused && dap.stackTrace.length > 0 && (
            <div className="px-3 py-2 border-t border-lorica-border/50 max-h-32 overflow-auto">
              {dap.stackTrace.map((frame, idx) => (
                <div
                  key={frame.id}
                  className={`py-1.5 px-2 border-b border-lorica-border/30 last:border-0 cursor-pointer hover:bg-lorica-border/30 ${
                    idx === 0 ? 'bg-lorica-accent/10' : ''
                  }`}
                  onClick={() => {
                    // In a real implementation, this would navigate to the frame location
                    console.log('Navigate to frame:', frame);
                  }}
                >
                  <div className="text-[10px] text-lorica-text font-medium">{frame.name}</div>
                  {frame.source && (
                    <div className="text-[9px] text-lorica-textDim truncate">
                      {frame.source.name}:{frame.line}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DebugPanel({ state, dispatch, activeFile }) {
  const [language, setLanguage] = useState('');
  const [args, setArgs] = useState('');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_RUN);

  // Auto-detect language from active file
  const detectedLang = activeFile ? LANGUAGES.find(l => l.ext.some(e => activeFile.name.endsWith(e))) : null;
  const currentLang = language || detectedLang?.id || '';

  const handleRun = async () => {
    if (!activeFile && !state.projectPath) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'warning', message: 'Open a file to run' } });
      return;
    }

    setRunning(true);
    setOutput(null);

    const config = {
      name: 'Run',
      language: currentLang,
      program: activeFile?.path || '',
      args: args.split(' ').filter(Boolean),
      cwd: state.projectPath || undefined,
      env: {},
    };

    try {
      const res = await window.lorica.debug.run(config);
      const data = res?.data || res;
      setOutput(data);

      if (data?.exit_code === 0) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: 'Program exited successfully', duration: 2000 } });
      } else if (data?.exit_code != null) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'warning', message: `Exited with code ${data.exit_code}` } });
      }
    } catch (e) {
      setOutput({ stdout: '', stderr: String(e), exit_code: -1 });
      dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: String(e) } });
    }

    setRunning(false);
  };

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showDebug', value: false });

  return (
    <div className="h-full flex flex-col bg-lorica-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lorica-border">
        <div className="flex items-center gap-2">
          <Bug size={14} className="text-lorica-accent" />
          <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Run & Debug</span>
        </div>
        <button onClick={close} className="text-lorica-textDim hover:text-lorica-text"><X size={14} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-lorica-border">
        <button
          onClick={() => setActiveTab(TAB_RUN)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === TAB_RUN
              ? 'text-lorica-accent border-b-2 border-lorica-accent'
              : 'text-lorica-textDim hover:text-lorica-text'
          }`}
        >
          Run
        </button>
        <button
          onClick={() => setActiveTab(TAB_DEBUG)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === TAB_DEBUG
              ? 'text-lorica-accent border-b-2 border-lorica-accent'
              : 'text-lorica-textDim hover:text-lorica-text'
          }`}
        >
          Debug
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-3 overflow-auto flex-1">
          {activeTab === TAB_RUN ? (
            <RunTab
              state={state}
              activeFile={activeFile}
              currentLang={currentLang}
              detectedLang={detectedLang}
              language={language}
              setLanguage={setLanguage}
              args={args}
              setArgs={setArgs}
              running={running}
              handleRun={handleRun}
            />
          ) : (
            <DebugTab
              state={state}
              dispatch={dispatch}
              activeFile={activeFile}
              currentLang={currentLang}
              detectedLang={detectedLang}
              language={language}
              setLanguage={setLanguage}
              args={args}
              setArgs={setArgs}
            />
          )}
        </div>

        {/* Output panel (shared) */}
        {output && (
          <div className="border-t border-lorica-border">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-lorica-border/50">
              <Terminal size={10} className="text-lorica-textDim" />
              <span className="text-[10px] text-lorica-textDim">Output</span>
              {output.exit_code != null && (
                <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded ${
                  output.exit_code === 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                }`}>
                  exit: {output.exit_code}
                </span>
              )}
            </div>
            <div className="p-3 font-mono text-[11px] leading-5 max-h-32 overflow-auto">
              {output.stdout && (
                <pre className="text-lorica-text whitespace-pre-wrap break-all">{output.stdout}</pre>
              )}
              {output.stderr && (
                <pre className="text-red-400 whitespace-pre-wrap break-all mt-1">{output.stderr}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

