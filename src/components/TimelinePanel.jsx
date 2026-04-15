import React, { useState, useEffect } from 'react';
import {
  Clock, GitCommit, User, Tag, MessageSquare, X, Search,
  Calendar, ChevronRight, ChevronDown, Filter, Layers, RefreshCw,
  CheckCircle, AlertCircle, Zap, BookOpen, Code, FileText
} from 'lucide-react';

// Mock timeline data - in real implementation, this would come from git history or task tracking
const generateTimeline = (projectPath) => {
  if (!projectPath) return [];

  const now = new Date();
  const timeline = [];
  
  // Recent commits
  timeline.push({
    id: 1,
    type: 'commit',
    title: 'feat: add outline panel',
    description: 'Implemented outline panel with symbol navigation',
    author: 'devli',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    icon: GitCommit,
    color: 'text-green-400',
    metadata: { hash: 'a1b2c3d', branch: 'main' }
  });

  timeline.push({
    id: 2,
    type: 'commit',
    title: 'fix: debugger for C++',
    description: 'Fixed codelldb integration for C++ debugging',
    author: 'devli',
    timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
    icon: GitCommit,
    color: 'text-green-400',
    metadata: { hash: 'b2c3d4e', branch: 'main' }
  });

  // Tasks
  timeline.push({
    id: 3,
    type: 'task',
    title: 'Implement timeline panel',
    description: 'Create timeline panel for activity tracking',
    author: 'system',
    timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    icon: CheckCircle,
    color: 'text-blue-400',
    metadata: { status: 'completed', priority: 'medium' }
  });

  timeline.push({
    id: 4,
    type: 'task',
    title: 'Add workspace trust',
    description: 'Implement workspace trust security feature',
    author: 'system',
    timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    icon: AlertCircle,
    color: 'text-yellow-400',
    metadata: { status: 'in-progress', priority: 'high' }
  });

  // File changes
  timeline.push({
    id: 5,
    type: 'file',
    title: 'Modified: src/components/Editor.jsx',
    description: 'Added minimap improvements',
    author: 'devli',
    timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    icon: FileText,
    color: 'text-purple-400',
    metadata: { linesAdded: 45, linesRemoved: 12 }
  });

  // Builds
  timeline.push({
    id: 6,
    type: 'build',
    title: 'Build #42 successful',
    description: 'All tests passed, ready for deployment',
    author: 'ci-system',
    timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    icon: Zap,
    color: 'text-green-400',
    metadata: { duration: '2m 34s', tests: '128 passed' }
  });

  // Sort by timestamp (newest first)
  return timeline.sort((a, b) => b.timestamp - a.timestamp);
};

function TimelineItem({ item, expandedItems, toggleExpand }) {
  const Icon = item.icon || Clock;
  const isExpanded = expandedItems.has(item.id);
  const hasDetails = item.metadata && Object.keys(item.metadata).length > 0;

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
  };

  return (
    <div className="border-b border-lorica-border/30 last:border-0">
      <div
        className="flex items-start gap-3 p-3 hover:bg-lorica-border/20 cursor-pointer"
        onClick={() => toggleExpand(item.id)}
      >
        {/* Icon */}
        <div className={`p-1.5 rounded-lg bg-lorica-border/30 ${item.color}`}>
          <Icon size={12} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-lorica-text truncate">{item.title}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-lorica-border/50 text-lorica-textDim">
              {item.type}
            </span>
          </div>
          <div className="text-[11px] text-lorica-textDim mt-0.5">{item.description}</div>
          
          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-lorica-textDim">
            <div className="flex items-center gap-1">
              <User size={9} />
              <span>{item.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={9} />
              <span>{formatTime(item.timestamp)}</span>
            </div>
          </div>

          {/* Expand indicator */}
          {hasDetails && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-lorica-accent">
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span>{isExpanded ? 'Show less' : 'Show details'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {hasDetails && isExpanded && (
        <div className="px-3 pb-3 pl-12">
          <div className="bg-lorica-border/20 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(item.metadata).map(([key, value]) => (
                <div key={key} className="text-[10px]">
                  <div className="text-lorica-textDim uppercase tracking-widest">{key}</div>
                  <div className="text-lorica-text font-mono">{String(value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimelinePanel({ state, dispatch }) {
  const [timeline, setTimeline] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'commits', 'tasks', 'files', 'builds'
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    const generated = generateTimeline(state.projectPath);
    setTimeline(generated);
    // Auto-expand latest item
    if (generated.length > 0) {
      setExpandedItems(new Set([generated[0].id]));
    }
  }, [state.projectPath]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        const generated = generateTimeline(state.projectPath);
        setTimeline(generated);
      }, 30000); // 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, state.projectPath]);

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const refreshTimeline = () => {
    const generated = generateTimeline(state.projectPath);
    setTimeline(generated);
    dispatch({ type: 'ADD_TOAST', toast: { type: 'info', message: 'Timeline refreshed' } });
  };

  const filteredTimeline = timeline.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && 
        !item.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showTimeline', value: false });

  const stats = {
    commits: timeline.filter(item => item.type === 'commit').length,
    tasks: timeline.filter(item => item.type === 'task').length,
    files: timeline.filter(item => item.type === 'file').length,
    builds: timeline.filter(item => item.type === 'build').length,
  };

  return (
    <div className="h-full flex flex-col bg-lorica-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lorica-border">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-lorica-accent" />
          <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Timeline</span>
        </div>
        <button onClick={close} className="text-lorica-textDim hover:text-lorica-text">
          <X size={14} />
        </button>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 border-b border-lorica-border/50 space-y-2">
        {/* Search and refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={10} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-lorica-textDim" />
            <input
              type="text"
              placeholder="Search timeline..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-lorica-bg border border-lorica-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent placeholder:text-lorica-textDim/50"
            />
          </div>
          <button
            onClick={refreshTimeline}
            className="px-3 py-1.5 bg-lorica-border hover:bg-lorica-border/80 rounded-lg text-xs text-lorica-text transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              filter === 'all'
                ? 'bg-lorica-accent/20 text-lorica-accent border border-lorica-accent/30'
                : 'bg-lorica-border text-lorica-textDim hover:text-lorica-text'
            }`}
          >
            All ({timeline.length})
          </button>
          <button
            onClick={() => setFilter('commit')}
            className={`px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1 ${
              filter === 'commit'
                ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                : 'bg-lorica-border text-lorica-textDim hover:text-lorica-text'
            }`}
          >
            <GitCommit size={9} />
            Commits ({stats.commits})
          </button>
          <button
            onClick={() => setFilter('task')}
            className={`px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1 ${
              filter === 'task'
                ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20'
                : 'bg-lorica-border text-lorica-textDim hover:text-lorica-text'
            }`}
          >
            <CheckCircle size={9} />
            Tasks ({stats.tasks})
          </button>
          <button
            onClick={() => setFilter('file')}
            className={`px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1 ${
              filter === 'file'
                ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20'
                : 'bg-lorica-border text-lorica-textDim hover:text-lorica-text'
            }`}
          >
            <FileText size={9} />
            Files ({stats.files})
          </button>
        </div>

        {/* Auto-refresh toggle */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[10px] text-lorica-textDim cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3 h-3 rounded border-lorica-border bg-lorica-bg text-lorica-accent focus:ring-lorica-accent"
            />
            Auto-refresh every 30s
          </label>
          <button
            onClick={() => setExpandedItems(new Set())}
            className="text-[10px] text-lorica-textDim hover:text-lorica-text"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Stats summary */}
      {state.projectPath && (
        <div className="px-3 py-2 border-b border-lorica-border/50">
          <div className="flex items-center justify-between text-[10px] text-lorica-textDim">
            <div className="flex items-center gap-1">
              <Layers size={10} />
              <span>Project activity</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span>{stats.commits} commits</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span>{stats.tasks} tasks</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline list */}
      <div className="flex-1 overflow-auto">
        {filteredTimeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-lorica-textDim p-4">
            <BookOpen size={24} className="mb-2 opacity-30" />
            <div className="text-xs text-center">
              {search || filter !== 'all' ? 'No matching events' : 'No timeline data available'}
            </div>
            {!state.projectPath && (
              <div className="text-[10px] text-lorica-accent mt-2">
                Open a project to see timeline
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredTimeline.map(item => (
              <TimelineItem
                key={item.id}
                item={item}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-lorica-border/50 text-[9px] text-lorica-textDim flex items-center justify-between">
        <span>
          {filteredTimeline.length} {filteredTimeline.length === 1 ? 'event' : 'events'}
        </span>
        <div className="flex items-center gap-2">
          <span>Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {autoRefresh && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>}
        </div>
      </div>
    </div>
  );
}