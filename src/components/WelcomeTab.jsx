import React, { useState, useEffect } from 'react';
import {
  Zap, FolderOpen, Bot, Terminal, Shield, Keyboard,
  Sparkles, Coffee, Rocket, GitBranch, Search, Image,
  ChevronRight, Star, Cpu, Eye, Palette, Lock, Brain, Wrench,
  Settings, Code, CpuIcon, Cloud, GitMerge, Cpu as CpuIcon2
} from 'lucide-react';

const FEATURES = [
  { icon: Cpu, label: 'Rust Engine', description: 'Backend natif optimisé', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  { icon: Brain, label: 'AI Copilot', description: 'Claude, DeepSeek, GPT-4o', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { icon: GitMerge, label: 'Git intégré', description: 'Stage, commit, branches', color: 'text-green-400', bg: 'bg-green-400/10' },
  { icon: Shield, label: 'Secure Vault', description: 'XChaCha20-Poly1305', color: 'text-red-400', bg: 'bg-red-400/10' },
  { icon: Terminal, label: 'Terminal natif', description: 'PowerShell, Bash, Zsh', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { icon: Code, label: 'Debugger', description: 'Python, C++, Rust, Node.js', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { icon: Eye, label: 'Visual Enhance', description: 'Sticky Scroll, Guides', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { icon: Palette, label: 'Customizable', description: 'Themes & Keymaps', color: 'text-pink-400', bg: 'bg-pink-400/10' },
];

const WHATS_NEW = [
  { 
    version: '2.0.0', 
    date: 'Avril 2026', 
    highlight: true,
    features: [
      { icon: Cpu, text: 'Moteur Rust optimisé et sécurisé — Performances ×2, sécurité renforcée', color: 'text-cyan-400' },
      { icon: Eye, text: 'Améliorations visuelles de l\'éditeur — Sticky Scroll, Guides d\'indentation, minimap fluide', color: 'text-blue-400' },
      { icon: Palette, text: 'Nouveau système de raccourcis personnalisables — Modifiez tous les raccourcis clavier', color: 'text-purple-400' },
      { icon: Lock, text: 'Sécurité avancée — Chiffrement XChaCha20-Poly1305, protection mémoire', color: 'text-green-400' },
      { icon: Brain, text: 'IA améliorée — Support multi‑modèles (Claude, DeepSeek, GPT‑4o)', color: 'text-amber-400' },
      { icon: Wrench, text: 'Outils développeur — Debugger intégré, profiling CPU/GPU, analyse de performance', color: 'text-orange-400' },
    ]
  },
];

const QUICK_ACTIONS = [
  { label: 'Open Folder', icon: FolderOpen, color: 'text-blue-400', bg: 'bg-blue-400/10 hover:bg-blue-400/20', action: 'onOpenFolder' },
  { label: 'AI Copilot', icon: Bot, color: 'text-purple-400', bg: 'bg-purple-400/10 hover:bg-purple-400/20', action: 'showAIPanel' },
  { label: 'Git Panel', icon: GitBranch, color: 'text-green-400', bg: 'bg-green-400/10 hover:bg-green-400/20', action: 'showGit' },
  { label: 'Global Search', icon: Search, color: 'text-amber-400', bg: 'bg-amber-400/10 hover:bg-amber-400/20', action: 'showSearch' },
  { label: 'Terminal', icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-400/10 hover:bg-emerald-400/20', action: 'showTerminal' },
  { label: 'Settings', icon: Settings, color: 'text-lorica-accent', bg: 'bg-lorica-accent/10 hover:bg-lorica-accent/20', action: 'showSettings' },
];

export default function WelcomeTab({ dispatch, onOpenFolder }) {
  const [visible, setVisible] = useState(false);
  const [showChangelog, setShowChangelog] = useState(true);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleAction = (action) => {
    if (action === 'onOpenFolder') {
      onOpenFolder();
    } else {
      dispatch({ type: 'SET_PANEL', panel: action, value: true });
    }
  };

  return (
    <div className={`h-full w-full flex items-center justify-center bg-lorica-bg overflow-auto transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-6xl px-8 py-10">
        {/* Header with logo and version */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-lorica-accent/20 to-lorica-accent/5 border border-lorica-accent/30 mb-4 shadow-lg">
            <Zap size={36} className="text-lorica-accent" />
          </div>
          <h1 className="text-3xl font-bold text-lorica-text tracking-tight">
            Lorica
            <span className="ml-3 text-sm font-semibold px-2 py-0.5 bg-lorica-accent/20 text-lorica-accent rounded-full">v2.0.0</span>
          </h1>
          <p className="text-sm text-lorica-textDim mt-2 max-w-lg mx-auto">
            Secure, AI‑powered native IDE with Rust backend, real‑time collaboration, and enterprise‑grade security.
          </p>
        </div>

        {/* What's New Highlight Card */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-lorica-accent/10 border border-lorica-accent/30 rounded-full">
              <Star size={12} className="text-lorica-accent" />
              <span className="text-xs font-semibold text-lorica-accent uppercase tracking-wider">Nouveautés v2.0.0</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-lorica-accent/20 to-transparent"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHATS_NEW[0].features.map((feature, idx) => (
              <div key={idx} className="group relative bg-lorica-surface/50 border border-lorica-border/40 rounded-xl p-4 hover:border-lorica-accent/30 transition-all hover:scale-[1.02]">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${feature.color.replace('text-', 'bg-')}/10 border ${feature.color.replace('text-', 'border-')}/20`}>
                    <feature.icon size={18} className={feature.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-lorica-text leading-tight">{feature.text.split('—')[0]}</p>
                    <p className="text-xs text-lorica-textDim mt-1">{feature.text.split('—')[1]}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Features */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-lorica-text mb-4 flex items-center gap-2">
                <CpuIcon2 size={18} className="text-lorica-accent" />
                Core Features
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FEATURES.map((feat, idx) => (
                  <div key={idx} className={`${feat.bg} border border-lorica-border/30 rounded-xl p-4 text-center transition-transform hover:scale-[1.03]`}>
                    <feat.icon size={22} className={`${feat.color} mx-auto mb-2`} />
                    <h3 className="text-xs font-semibold text-lorica-text mb-1">{feat.label}</h3>
                    <p className="text-[10px] text-lorica-textDim">{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-lorica-text mb-4 flex items-center gap-2">
                <Rocket size={18} className="text-lorica-accent" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {QUICK_ACTIONS.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAction(action.action)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-lorica-border/40 ${action.bg} transition-all group hover:border-lorica-accent/30`}
                  >
                    <action.icon size={20} className={`${action.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs font-medium text-lorica-textDim group-hover:text-lorica-text transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Shortcuts & Tips */}
          <div className="space-y-6">
            {/* Customizable Shortcuts Card */}
            <div className="bg-gradient-to-br from-lorica-accent/5 to-lorica-accent/10 border border-lorica-accent/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Palette size={18} className="text-lorica-accent" />
                <div>
                  <h3 className="text-sm font-semibold text-lorica-text">Customizable Shortcuts</h3>
                  <p className="text-xs text-lorica-textDim">Modify any keyboard shortcut</p>
                </div>
              </div>
              <p className="text-xs text-lorica-textDim mb-4">
                Lorica now features a dynamic keymap system. Customize shortcuts for every action via Settings → Keyboard Shortcuts.
              </p>
              <button
                onClick={() => dispatch({ type: 'SET_PANEL', panel: 'showSettings', value: true })}
                className="w-full text-xs font-medium px-4 py-2 bg-lorica-accent/20 hover:bg-lorica-accent/30 text-lorica-accent border border-lorica-accent/30 rounded-lg transition-colors"
              >
                Open Shortcuts Settings
              </button>
            </div>

            {/* Essential Shortcuts */}
            <div className="bg-lorica-surface/40 border border-lorica-border/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Keyboard size={16} className="text-lorica-accent" />
                <h3 className="text-sm font-semibold text-lorica-text">Essential Shortcuts</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  ['Ctrl+P', 'Command Palette'],
                  ['Ctrl+Shift+P', 'Go to File'],
                  ['Ctrl+Shift+F', 'Search in Files'],
                  ['Ctrl+K → Z', 'Zen Mode'],
                  ['Ctrl+\\', 'Split Editor'],
                  ['Ctrl+Shift+G', 'Git Panel'],
                  ['Ctrl+Shift+A', 'AI Copilot'],
                  ['Ctrl+J', 'Snippets'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-lorica-textDim">{desc}</span>
                    <kbd className="px-2 py-1 bg-lorica-bg border border-lorica-border rounded text-lorica-accent font-mono text-xs">{key}</kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-lorica-accent/5 border border-lorica-accent/10 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-lorica-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-lorica-accent mb-1">Pro Tip</h4>
                  <p className="text-xs text-lorica-textDim">
                    Press <kbd className="px-1.5 py-0.5 bg-lorica-bg border border-lorica-border rounded text-lorica-accent/80 font-mono text-[10px]">Ctrl+K → Z</kbd> to enter Zen Mode for distraction‑free coding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-lorica-border/20 text-center">
          <p className="text-xs text-lorica-textDim">
            Lorica v2.0.0 • Built with Rust, React, and CodeMirror •{' '}
            <button 
              onClick={() => dispatch({ type: 'SET_PANEL', panel: 'showSettings', value: true })}
              className="text-lorica-accent hover:underline"
            >
              Customize your experience
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

