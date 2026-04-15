import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen, Save, Settings, Shield, Lock, Bot, Music, Terminal,
  PanelLeftClose, PanelLeftOpen, Minus, Square, X, ClipboardList, GitCompare,
  Play, Pause, SkipForward, SkipBack
} from 'lucide-react';

export default function MenuBar({ state, dispatch, onOpenFolder, onSave, onLock, spotify }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);
  const menuRef = useRef(null);

  const { token, currentTrack, login, play, pause, next, previous } = spotify;

  // 🟢 FIX 1 : Fermer les menus si on clique ailleurs
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 🟢 FIX 2 : Appliquer le thème en temps réel sur toute l'application
  useEffect(() => {
    document.body.className = `theme-${state.theme || 'midnight'} bg-lorica-bg text-lorica-text font-sans overflow-hidden transition-colors duration-300`;
  }, [state.theme]);

  const menus = {
    File: [
      { label: 'Open Folder', icon: FolderOpen, shortcut: 'Ctrl+O', action: () => { onOpenFolder(); setOpenMenu(null); } },
      { label: 'Save', icon: Save, shortcut: 'Ctrl+S', action: () => { onSave(); setOpenMenu(null); } },
      { type: 'separator' },
      { label: 'Settings', icon: Settings, shortcut: 'Ctrl+,', action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showSettings' }); setOpenMenu(null); } },
    ],
    View: [
      { label: 'File Explorer', icon: state.showFileTree ? PanelLeftClose : PanelLeftOpen, shortcut: 'Ctrl+B', action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showFileTree' }); setOpenMenu(null); } },
      { label: 'Terminal', icon: Terminal, shortcut: 'Ctrl+`', action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showTerminal' }); setOpenMenu(null); } },
      { label: 'AI Copilot', icon: Bot, shortcut: 'Ctrl+Shift+A', action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showAIPanel' }); setOpenMenu(null); } },
      { label: 'Spotify', icon: Music, action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showSpotify' }); if (!state.showAIPanel) dispatch({ type: 'SET_PANEL', panel: 'showAIPanel', value: true }); setOpenMenu(null); } },
    ],
    Security: [
      { label: 'Secret Vault', icon: Shield, action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showSecretVault' }); setOpenMenu(null); } },
      { label: 'Audit Log', icon: ClipboardList, action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showAuditLog' }); setOpenMenu(null); } },
      { label: 'Diff Viewer', icon: GitCompare, action: () => { dispatch({ type: 'TOGGLE_PANEL', panel: 'showDiffViewer' }); setOpenMenu(null); } },
      { type: 'separator' },
      { label: 'Lock IDE', icon: Lock, shortcut: 'Ctrl+L', action: () => { onLock(); setOpenMenu(null); } },
    ],
  };

  return (
    <div className="relative flex items-center h-10 bg-lorica-surface border-b border-lorica-border select-none" style={{ WebkitAppRegion: 'drag' }} ref={menuRef}>
      
      <div className="flex items-center gap-2 px-4" style={{ WebkitAppRegion: 'no-drag' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-lorica-accent">
          <path d="M12 2L2 7.5V16.5L12 22L22 16.5V7.5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="4" fill="currentColor" className="animate-pulse-glow" />
        </svg>
        <span className="text-sm font-bold text-lorica-text tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-lorica-textDim">
          Lorica
        </span>
      </div>

      <div className="flex items-center gap-0" style={{ WebkitAppRegion: 'no-drag' }}>
        {Object.entries(menus).map(([name, items]) => (
          <div key={name} className="relative">
            <button
              className={`px-3 py-1 text-xs font-medium transition-colors rounded-sm ${
                openMenu === name ? 'bg-lorica-panel text-lorica-accent' : 'text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/50'
              }`}
              onClick={() => setOpenMenu(openMenu === name ? null : name)}
              onMouseEnter={() => openMenu && setOpenMenu(name)}
            >
              {name}
            </button>
            {openMenu === name && (
              <div className="absolute top-full left-0 mt-0.5 bg-lorica-panel border border-lorica-border rounded-lg shadow-2xl py-1 min-w-[220px] z-50 animate-fadeIn">
                {items.map((item, i) =>
                  item.type === 'separator' ? (
                    <div key={i} className="border-t border-lorica-border my-1" />
                  ) : (
                    <button
                      key={i}
                      className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-lorica-text hover:bg-lorica-accent/10 hover:text-lorica-accent transition-colors"
                      onClick={item.action}
                    >
                      <item.icon size={14} className="opacity-60" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.shortcut && <span className="text-lorica-textDim text-[10px]">{item.shortcut}</span>}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* DYNAMIC ISLAND SPOTIFY */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1 flex justify-center z-50" style={{ WebkitAppRegion: 'no-drag' }}>
        <div 
          onMouseEnter={() => setIsIslandExpanded(true)}
          onMouseLeave={() => setIsIslandExpanded(false)}
          className={`bg-black/80 backdrop-blur-md border border-white/10 overflow-hidden flex items-center transition-all duration-300 ease-in-out shadow-[0_0_15px_rgba(29,185,84,0.15)] ${
            !token ? 'cursor-pointer h-7 w-32 rounded-full px-3 hover:border-lorica-spotify/50' : 
            isIslandExpanded ? 'h-14 w-72 rounded-2xl px-3' : 'h-8 w-40 rounded-full px-3'
          }`}
          onClick={!token ? login : undefined}
        >
          {!token ? (
            <div className="flex items-center justify-center gap-2 w-full">
              <Music size={12} className="text-lorica-spotify animate-pulse" />
              <span className="text-[10px] text-white font-medium truncate">Connect Spotify</span>
            </div>
          ) : currentTrack ? (
            <>
              <div className={`flex items-center gap-2 w-full transition-opacity duration-200 ${isIslandExpanded ? 'hidden' : 'opacity-100'}`}>
                <img src={currentTrack.albumArt} alt="cover" className="w-5 h-5 rounded-full animate-[spin_4s_linear_infinite]" style={{ animationPlayState: currentTrack.isPlaying ? 'running' : 'paused' }} />
                <div className="flex-1 overflow-hidden">
                  <div className="text-[10px] text-white font-medium truncate">{currentTrack.name}</div>
                </div>
                {currentTrack.isPlaying && (
                  <div className="flex gap-0.5 h-2.5 items-end">
                    <div className="w-0.5 bg-lorica-spotify h-full animate-[bounce_1s_infinite]"></div>
                    <div className="w-0.5 bg-lorica-spotify h-1/2 animate-[bounce_1.2s_infinite]"></div>
                    <div className="w-0.5 bg-lorica-spotify h-3/4 animate-[bounce_0.8s_infinite]"></div>
                  </div>
                )}
              </div>

              <div className={`flex items-center gap-3 w-full transition-opacity duration-300 ${isIslandExpanded ? 'opacity-100' : 'hidden'}`}>
                <img src={currentTrack.albumArt} alt="cover" className="w-10 h-10 rounded-md border border-white/10 shadow-lg" />
                <div className="flex-1 flex flex-col justify-center overflow-hidden">
                  <span className="text-xs text-white font-bold truncate leading-tight">{currentTrack.name}</span>
                  <span className="text-[10px] text-lorica-textDim truncate">{currentTrack.artist}</span>
                </div>
                <div className="flex items-center gap-3 pr-2">
                  <button onClick={previous} className="text-white/70 hover:text-white transition-colors"><SkipBack size={14} /></button>
                  <button onClick={currentTrack.isPlaying ? pause : play} className="w-7 h-7 flex items-center justify-center bg-white rounded-full text-black hover:scale-105 transition-transform">
                    {currentTrack.isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button onClick={next} className="text-white/70 hover:text-white transition-colors"><SkipForward size={14} /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full">
              <Music size={12} className="text-lorica-spotify opacity-50" />
              <span className="text-[10px] text-white/50 font-medium truncate">Spotify ouvert, en attente...</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* WINDOW CONTROLS - visible on all OS */}
      <div className="flex items-center gap-0.5 mr-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={() => window.lorica?.window.minimize()}
          className="w-10 h-10 flex items-center justify-center text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/80 transition-colors rounded-none"
          title="Minimize"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => window.lorica?.window.maximize()}
          className="w-10 h-10 flex items-center justify-center text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/80 transition-colors rounded-none"
          title={window.lorica?.platform === 'darwin' ? 'Full Screen' : 'Maximize'}
        >
          <Square size={11} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => window.lorica?.window.close()}
          className="w-10 h-10 flex items-center justify-center text-lorica-textDim hover:text-white hover:bg-red-600 transition-colors rounded-none"
          title="Close"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
