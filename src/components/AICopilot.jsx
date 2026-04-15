import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Wrench, Bug, FileText, Zap, FlaskConical, Loader2 } from 'lucide-react';

export default function AICopilot({ state, dispatch, ai, activeFile }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.aiMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const codeContext = activeFile ? {
      code: activeFile.content,
      fileName: activeFile.name,
      language: activeFile.extension,
    } : null;
    ai.sendMessage(input, codeContext);
    setInput('');
  };

  const handleQuickAction = (action) => {
    if (!activeFile) return;
    ai.quickAction(action, activeFile.content, activeFile.name, activeFile.extension);
  };

  const quickActions = [
    { key: 'explain', label: 'Explain', icon: Sparkles, color: 'text-blue-400' },
    { key: 'refactor', label: 'Refactor', icon: Wrench, color: 'text-yellow-400' },
    { key: 'fix', label: 'Fix', icon: Bug, color: 'text-red-400' },
    { key: 'document', label: 'Document', icon: FileText, color: 'text-green-400' },
    { key: 'optimize', label: 'Optimize', icon: Zap, color: 'text-purple-400' },
    { key: 'test', label: 'Test', icon: FlaskConical, color: 'text-cyan-400' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-lorica-border">
        <Bot size={14} className="text-lorica-accent" />
        <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">AI Copilot</span>
        
        {/* Provider badge */}
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full border border-current opacity-70 ${
            state.aiProvider === 'anthropic' ? 'text-purple-400' : 'text-blue-400'
          }`}
        >
          {state.aiProvider === 'anthropic' ? 'Claude' : 'DeepSeek'}
        </span>
        
        {state.aiLoading && <Loader2 size={12} className="animate-spin text-lorica-accent ml-auto" />}
      </div>

      {/* Quick Actions */}
      {activeFile && (
        <div className="flex flex-wrap gap-1 px-2 py-2 border-b border-lorica-border/50">
          {quickActions.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => handleQuickAction(key)}
              disabled={state.aiLoading}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border border-lorica-border hover:border-lorica-accent/50 transition-colors disabled:opacity-40 ${color}`}
            >
              <Icon size={10} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {state.aiMessages.length === 0 && (
          <div className="text-center py-8 text-lorica-textDim">
            <Bot size={32} className="mx-auto mb-2 opacity-20" />
            <div className="text-xs opacity-60">Ask me anything about your code</div>
            <div className="text-[10px] opacity-40 mt-1">I can explain, refactor, fix, and more</div>
          </div>
        )}
        {state.aiMessages.map((msg, i) => (
          <div key={i} className={`animate-fadeIn ${msg.role === 'user' ? 'ml-6' : 'mr-2'}`}>
            <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-lorica-accent/10 text-lorica-text border border-lorica-accent/20'
                : 'bg-lorica-panel text-lorica-text border border-lorica-border'
            }`}>
              <pre className="whitespace-pre-wrap font-mono text-[11px] break-words">{msg.content}</pre>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-lorica-border">
        <div className="flex items-center gap-2 bg-lorica-bg rounded-lg border border-lorica-border px-3 py-1.5 focus-within:border-lorica-accent/50 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask about your code..."
            className="flex-1 bg-transparent text-xs text-lorica-text outline-none placeholder:text-lorica-textDim/50"
            disabled={state.aiLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || state.aiLoading}
            className="p-1 text-lorica-accent hover:bg-lorica-accent/10 rounded transition-colors disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
