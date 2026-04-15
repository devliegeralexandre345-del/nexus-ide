/**
 * Dynamic keyboard shortcuts management system
 */

// Default keyboard shortcuts for Lorica
export const DEFAULT_SHORTCUTS = {
  // Editor actions
  'saveFile': { key: 'Ctrl+S', description: 'Save current file', action: 'saveActive' },
  'toggleZen': { key: 'Ctrl+K → Z', description: 'Toggle Zen Mode', action: 'toggleZen' },
  'toggleSplit': { key: 'Ctrl+\\', description: 'Toggle Split Editor', action: 'toggleSplit' },
  'toggleMinimap': { key: 'Ctrl+Shift+M', description: 'Toggle Minimap', action: 'toggleMinimap' },
  'toggleAutoSave': { key: 'Ctrl+Shift+A', description: 'Toggle Auto-save', action: 'toggleAutoSave' },
  
  // Panel toggles
  'commandPalette': { key: 'Ctrl+P', description: 'Open Command Palette', action: 'panel:showCommandPalette' },
  'filePalette': { key: 'Ctrl+Shift+P', description: 'Go to File', action: 'panel:showFilePalette' },
  'globalSearch': { key: 'Ctrl+Shift+F', description: 'Search in Files', action: 'panel:showSearch' },
  'gitPanel': { key: 'Ctrl+Shift+G', description: 'Open Git Panel', action: 'panel:showGit' },
  'problemsPanel': { key: 'Ctrl+Shift+M', description: 'Open Problems Panel', action: 'panel:showProblems' },
  'aiCopilot': { key: 'Ctrl+Shift+A', description: 'Open AI Copilot', action: 'panel:showAIPanel' },
  'snippets': { key: 'Ctrl+J', description: 'Open Snippets', action: 'panel:showSnippets' },
  'toggleSidebar': { key: 'Ctrl+B', description: 'Toggle Sidebar', action: 'panel:showFileTree' },
  'toggleTerminal': { key: 'Ctrl+`', description: 'Toggle Terminal', action: 'panel:showTerminal' },
  'lockIDE': { key: 'Ctrl+L', description: 'Lock IDE', action: 'lock' },
  
  // Special
  'escape': { key: 'Escape', description: 'Close active panel / Exit Zen', action: 'escape' },
};

// Parse a shortcut string into a normalized object
export function parseShortcut(shortcutStr) {
  const parts = shortcutStr.split('→').map(s => s.trim());
  const main = parts[0];
  
  let ctrl = false;
  let shift = false;
  let alt = false;
  let meta = false;
  let key = '';
  
  const mainParts = main.split('+').map(p => p.trim());
  for (const part of mainParts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'cmd' || lower === 'command') ctrl = true;
    else if (lower === 'shift') shift = true;
    else if (lower === 'alt' || lower === 'option') alt = true;
    else if (lower === 'meta' || lower === 'win') meta = true;
    else key = part;
  }
  
  // Handle multi-step shortcuts (like Ctrl+K → Z)
  const sequence = parts.length > 1 ? [main, ...parts.slice(1)] : [main];
  
  return {
    original: shortcutStr,
    ctrl,
    shift,
    alt,
    meta,
    key: key || main, // fallback if no modifier
    sequence,
    isMultiStep: parts.length > 1,
  };
}

// Convert keyboard event to shortcut string
export function eventToShortcut(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  
  // Normalize key names
  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key === '`') key = '`';
  else if (key === '\\') key = '\\';
  else if (key === 'Escape') key = 'Escape';
  else if (key === 'Enter') key = 'Enter';
  else if (key === 'Tab') key = 'Tab';
  else if (key === 'Backspace') key = 'Backspace';
  else if (key === 'Delete') key = 'Delete';
  else if (key === 'ArrowUp') key = '↑';
  else if (key === 'ArrowDown') key = '↓';
  else if (key === 'ArrowLeft') key = '←';
  else if (key === 'ArrowRight') key = '→';
  else if (key.length === 1) key = key.toUpperCase();
  
  parts.push(key);
  return parts.join('+');
}

// Check if two shortcuts conflict
export function shortcutsConflict(shortcut1, shortcut2) {
  if (!shortcut1 || !shortcut2) return false;
  const s1 = parseShortcut(shortcut1);
  const s2 = parseShortcut(shortcut2);
  
  // Simple check: same key combination
  return s1.key === s2.key && s1.ctrl === s2.ctrl && s1.shift === s2.shift && s1.alt === s2.alt && s1.meta === s2.meta;
}

// Load custom shortcuts from localStorage
export function loadCustomShortcuts() {
  try {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem('Lorica_shortcuts');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save custom shortcuts to localStorage
export function saveCustomShortcuts(customMap) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem('Lorica_shortcuts', JSON.stringify(customMap));
  } catch (error) {
    console.error('Failed to save shortcuts:', error);
  }
}

// Get effective shortcut for an action (custom or default)
export function getShortcut(actionId, customMap = null) {
  const map = customMap || loadCustomShortcuts();
  return map[actionId] || DEFAULT_SHORTCUTS[actionId]?.key || '';
}

// Get all shortcuts with custom overrides
export function getAllShortcuts(customMap = null) {
  const map = customMap || loadCustomShortcuts();
  const result = {};
  
  for (const [actionId, defaultDef] of Object.entries(DEFAULT_SHORTCUTS)) {
    result[actionId] = {
      ...defaultDef,
      key: map[actionId] || defaultDef.key,
      custom: map[actionId] !== undefined,
    };
  }
  
  return result;
}

// Validate shortcut format
export function isValidShortcut(shortcutStr) {
  if (!shortcutStr || typeof shortcutStr !== 'string') return false;
  
  // Basic validation: should contain at least one key
  const parts = shortcutStr.split('→').map(s => s.trim());
  if (parts.length === 0) return false;
  
  // Each part should have at least one non-modifier key
  for (const part of parts) {
    const subparts = part.split('+').map(p => p.trim());
    const hasKey = subparts.some(p => {
      const lower = p.toLowerCase();
      return !['ctrl', 'cmd', 'command', 'shift', 'alt', 'option', 'meta', 'win'].includes(lower);
    });
    if (!hasKey) return false;
  }
  
  return true;
}

// Find conflicts in a set of shortcuts
export function findConflicts(customMap) {
  const conflicts = [];
  const allActions = Object.keys(DEFAULT_SHORTCUTS);
  
  for (let i = 0; i < allActions.length; i++) {
    for (let j = i + 1; j < allActions.length; j++) {
      const action1 = allActions[i];
      const action2 = allActions[j];
      const shortcut1 = customMap[action1] || DEFAULT_SHORTCUTS[action1]?.key;
      const shortcut2 = customMap[action2] || DEFAULT_SHORTCUTS[action2]?.key;
      
      if (shortcut1 && shortcut2 && shortcutsConflict(shortcut1, shortcut2)) {
        conflicts.push({
          action1,
          action2,
          shortcut: shortcut1,
          description1: DEFAULT_SHORTCUTS[action1]?.description,
          description2: DEFAULT_SHORTCUTS[action2]?.description,
        });
      }
    }
  }
  
  return conflicts;
}
