import { useEffect, useRef, useCallback } from 'react';
import { parseShortcut, loadCustomShortcuts, getShortcut } from '../utils/keymap';

/**
 * Hook to manage dynamic keyboard shortcuts with custom overrides
 */
export function useShortcuts(state, dispatch, actions, security) {
  const customShortcutsRef = useRef({});
  const zenKeyRef = useRef(false);

  // Load custom shortcuts on mount
  useEffect(() => {
    customShortcutsRef.current = loadCustomShortcuts();
  }, []);

  // Helper to check if a shortcut matches a custom mapping
  const matchesShortcut = useCallback((e, shortcutStr) => {
    if (!shortcutStr) return false;
    
    const parsed = parseShortcut(shortcutStr);
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;
    
    // Handle multi-step shortcuts (like Ctrl+K → Z)
    if (parsed.isMultiStep) {
      // For now, we'll handle Zen Mode separately
      return false;
    }
    
    // Check modifiers
    if (parsed.ctrl !== ctrl) return false;
    if (parsed.shift !== shift) return false;
    if (parsed.alt !== alt) return false;
    
    // Check key
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
    
    return key === parsed.key;
  }, []);

  // Main keyboard handler with custom shortcuts support
  const handleKeyDown = useCallback((e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shortcuts = customShortcutsRef.current;

    // Zen Mode step 1: Ctrl+K (hardcoded for now)
    if (ctrl && e.key === 'k') {
      e.preventDefault();
      zenKeyRef.current = true;
      setTimeout(() => { zenKeyRef.current = false; }, 1500);
      return;
    }
    // Zen Mode step 2: Z (without Ctrl to avoid undo)
    if (zenKeyRef.current && !ctrl && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      zenKeyRef.current = false;
      actions.toggleZen();
      return;
    }

    // Check custom shortcuts for each action
    const checkAndExecute = (actionId, defaultHandler) => {
      const customShortcut = getShortcut(actionId, shortcuts);
      if (customShortcut && matchesShortcut(e, customShortcut)) {
        e.preventDefault();
        defaultHandler();
        return true;
      }
      return false;
    };

    // Try each action with custom shortcuts
    const handled = 
      // Editor actions
      checkAndExecute('saveFile', () => actions.saveActive()) ||
      checkAndExecute('toggleSplit', () => actions.toggleSplit()) ||
      checkAndExecute('toggleMinimap', () => actions.toggleMinimap()) ||
      checkAndExecute('toggleAutoSave', () => actions.toggleAutoSave()) ||
      
      // Panel toggles
      checkAndExecute('commandPalette', () => dispatch({ type: 'TOGGLE_PANEL', panel: 'showCommandPalette' })) ||
      checkAndExecute('filePalette', () => dispatch({ type: 'SET_PANEL', panel: 'showFilePalette', value: true })) ||
      checkAndExecute('globalSearch', () => dispatch({ type: 'SET_PANEL', panel: 'showSearch', value: true })) ||
      checkAndExecute('gitPanel', () => dispatch({ type: 'TOGGLE_PANEL', panel: 'showGit' })) ||
      checkAndExecute('problemsPanel', () => dispatch({ type: 'TOGGLE_PANEL', panel: 'showProblems' })) ||
      checkAndExecute('aiCopilot', () => dispatch({ type: 'TOGGLE_PANEL', panel: 'showAIPanel' })) ||
      checkAndExecute('snippets', () => dispatch({ type: 'SET_PANEL', panel: 'showSnippets', value: true })) ||
      checkAndExecute('toggleSidebar', () => dispatch({ type: 'TOGGLE_PANEL', panel: 'showFileTree' })) ||
      checkAndExecute('toggleTerminal', () => dispatch({ type: 'TOGGLE_PANEL', panel: 'showTerminal' })) ||
      checkAndExecute('lockIDE', () => security.lock()) ||
      
      // Escape (special handling)
      (getShortcut('escape', shortcuts) === 'Escape' && e.key === 'Escape' && (() => {
        const s = state; // Use state from closure
        if (s.zenMode) {
          actions.toggleZen();
        } else {
          dispatch({ type: 'SET_PANEL', panel: 'showCommandPalette', value: false });
          dispatch({ type: 'SET_PANEL', panel: 'showSettings', value: false });
          dispatch({ type: 'SET_PANEL', panel: 'showSecretVault', value: false });
          dispatch({ type: 'SET_PANEL', panel: 'showAuditLog', value: false });
          dispatch({ type: 'SET_PANEL', panel: 'showDiffViewer', value: false });
          dispatch({ type: 'SET_PANEL', panel: 'showFilePalette', value: false });
          dispatch({ type: 'SET_PANEL', panel: 'showSearch', value: false });
          dispatch({ type: 'SET_PANEL', panel: 'showSnippets', value: false });
        }
        return true;
      })());

    // If custom shortcut handled, return
    if (handled) return;

    // Fallback to default shortcuts if no custom match
    // Default shortcuts (keep original logic as fallback)
    if (ctrl && !e.shiftKey && e.key === 'p') { e.preventDefault(); dispatch({ type: 'TOGGLE_PANEL', panel: 'showCommandPalette' }); }
    if (ctrl && e.shiftKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); dispatch({ type: 'SET_PANEL', panel: 'showFilePalette', value: true }); }
    if (ctrl && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); dispatch({ type: 'SET_PANEL', panel: 'showSearch', value: true }); }
    if (ctrl && e.shiftKey && (e.key === 'G' || e.key === 'g')) { e.preventDefault(); dispatch({ type: 'TOGGLE_PANEL', panel: 'showGit' }); }
    if (ctrl && e.shiftKey && (e.key === 'M' || e.key === 'm')) { e.preventDefault(); dispatch({ type: 'TOGGLE_PANEL', panel: 'showProblems' }); }
    if (ctrl && !e.shiftKey && e.key === 'j') { e.preventDefault(); dispatch({ type: 'SET_PANEL', panel: 'showSnippets', value: true }); }
    if (ctrl && e.key === 's') { e.preventDefault(); actions.saveActive(); }
    if (ctrl && !e.shiftKey && e.key === 'b') { e.preventDefault(); dispatch({ type: 'TOGGLE_PANEL', panel: 'showFileTree' }); }
    if (ctrl && e.key === '`') { e.preventDefault(); dispatch({ type: 'TOGGLE_PANEL', panel: 'showTerminal' }); }
    if (ctrl && e.shiftKey && (e.key === 'A' || e.key === 'a')) { e.preventDefault(); dispatch({ type: 'TOGGLE_PANEL', panel: 'showAIPanel' }); }
    if (ctrl && e.key === 'l') { e.preventDefault(); security.lock(); }
    if (ctrl && e.key === '\\') { e.preventDefault(); actions.toggleSplit(); }

    if (e.key === 'Escape') {
      const s = state;
      if (s.zenMode) {
        actions.toggleZen();
      } else {
        dispatch({ type: 'SET_PANEL', panel: 'showCommandPalette', value: false });
        dispatch({ type: 'SET_PANEL', panel: 'showSettings', value: false });
        dispatch({ type: 'SET_PANEL', panel: 'showSecretVault', value: false });
        dispatch({ type: 'SET_PANEL', panel: 'showAuditLog', value: false });
        dispatch({ type: 'SET_PANEL', panel: 'showDiffViewer', value: false });
        dispatch({ type: 'SET_PANEL', panel: 'showFilePalette', value: false });
        dispatch({ type: 'SET_PANEL', panel: 'showSearch', value: false });
        dispatch({ type: 'SET_PANEL', panel: 'showSnippets', value: false });
      }
    }
  }, [state, dispatch, actions, security, matchesShortcut]);

  // Setup keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return function to refresh shortcuts (e.g., after settings change)
  const refreshShortcuts = useCallback(() => {
    customShortcutsRef.current = loadCustomShortcuts();
  }, []);

  return { refreshShortcuts };
}