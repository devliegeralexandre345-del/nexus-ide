import { Decoration, ViewPlugin, EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

/**
 * Indentation Guides - Vertical lines showing indentation levels
 * Inspired by VS Code's indent guides feature
 */
function indentGuides({ highlightActive = true, colors = {} } = {}) {
  // Default colors for light/dark themes
  const defaultColors = {
    light: {
      guide: 'rgba(0, 0, 0, 0.12)',
      activeGuide: 'rgba(0, 0, 0, 0.24)',
    },
    dark: {
      guide: 'rgba(255, 255, 255, 0.08)',
      activeGuide: 'rgba(255, 255, 255, 0.2)',
    },
  };
  
  const themeColors = colors.dark || defaultColors.dark; // Using dark as default for Lorica
  
  // Calculate indentation level for each line
  function calculateIndentLevels(doc, tabSize) {
    const levels = new Map();
    const lineCount = doc.lines;
    
    for (let lineNum = 1; lineNum <= lineCount; lineNum++) {
      const line = doc.line(lineNum);
      const text = line.text;
      
      let indent = 0;
      let i = 0;
      while (i < text.length) {
        if (text[i] === '\t') {
          indent += tabSize - (indent % tabSize);
          i++;
        } else if (text[i] === ' ') {
          indent++;
          i++;
        } else {
          break;
        }
      }
      
      // Store indent level and character position
      levels.set(lineNum - 1, {
        level: Math.floor(indent / tabSize),
        spaces: indent,
        startPos: line.from,
        endPos: line.to,
        isEmpty: text.trim().length === 0,
      });
    }
    
    return levels;
  }
  
  // Find lines in the same scope/block
  function findScopeLines(levels, lineNum, tabSize) {
    const currentLevel = levels.get(lineNum)?.level || 0;
    const scopeLines = [lineNum];
    
    // Look backwards for higher level or same level start
    let startLine = lineNum;
    for (let i = lineNum - 1; i >= 0; i--) {
      const level = levels.get(i)?.level || 0;
      if (level < currentLevel) {
        startLine = i;
        break;
      }
      if (i === 0) {
        startLine = 0;
      }
    }
    
    // Look forward for end of scope
    let endLine = lineNum;
    for (let i = lineNum + 1; i < levels.size; i++) {
      const level = levels.get(i)?.level || 0;
      if (level < currentLevel) {
        endLine = i - 1;
        break;
      }
      if (i === levels.size - 1) {
        endLine = levels.size - 1;
      }
    }
    
    return { startLine, endLine };
  }
  
  // Create decoration for a single indent guide
  function createGuideDecoration(level, isActive = false, isEmptyLine = false) {
    return Decoration.line({
      attributes: {
        style: `
          background-image: linear-gradient(to right,
            ${isActive ? themeColors.activeGuide : themeColors.guide} 1px,
            transparent 1px
          );
          background-position-x: ${level * 2}ch;
          background-repeat: repeat-y;
          background-size: ${2}ch 1px;
          ${isEmptyLine ? 'opacity: 0.6;' : ''}
        `,
        class: `indent-guide indent-level-${level} ${isActive ? 'active-indent' : ''} ${isEmptyLine ? 'empty-line' : ''}`,
        'data-indent-level': level.toString(),
      },
    });
  }
  
  // Main plugin class
  class IndentGuidesPlugin {
    constructor(view) {
      this.view = view;
      this.tabSize = view.state.tabSize;
      this.decorations = this.computeDecorations(view);
    }
    
    update(update) {
      if (update.docChanged || update.viewportChanged || update.state.tabSize !== this.tabSize) {
        this.tabSize = update.state.tabSize;
        this.decorations = this.computeDecorations(update.view);
      }
    }
    
    computeDecorations(view) {
      const doc = view.state.doc;
      const tabSize = view.state.tabSize;
      const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
      
      const indentLevels = calculateIndentLevels(doc, tabSize);
      const scopeInfo = findScopeLines(indentLevels, cursorLine, tabSize);
      
      const builder = new Decoration.SetBuilder();
      const lineCount = doc.lines;
      
      // Add indent guides for each line
      for (let lineNum = 0; lineNum < lineCount; lineNum++) {
        const indentInfo = indentLevels.get(lineNum);
        if (!indentInfo || indentInfo.isEmpty) continue;
        
        const isActiveScope = highlightActive && 
          lineNum >= scopeInfo.startLine && 
          lineNum <= scopeInfo.endLine;
        
        // Add guides for each indent level up to the current level
        for (let level = 0; level < indentInfo.level; level++) {
          const isActiveLevel = isActiveScope && level < indentInfo.level;
          builder.add(
            doc.line(lineNum + 1).from,
            doc.line(lineNum + 1).from,
            createGuideDecoration(level, isActiveLevel, indentInfo.isEmpty)
          );
        }
      }
      
      // Also handle empty lines - show guides at previous line's indent level
      for (let lineNum = 0; lineNum < lineCount; lineNum++) {
        const indentInfo = indentLevels.get(lineNum);
        if (indentInfo && !indentInfo.isEmpty) continue;
        
        // Find previous non-empty line
        let prevLine = lineNum - 1;
        while (prevLine >= 0) {
          const prevInfo = indentLevels.get(prevLine);
          if (prevInfo && !prevInfo.isEmpty) {
            // Add guides at previous line's indent levels
            for (let level = 0; level < prevInfo.level; level++) {
              builder.add(
                doc.line(lineNum + 1).from,
                doc.line(lineNum + 1).from,
                createGuideDecoration(level, false, true)
              );
            }
            break;
          }
          prevLine--;
        }
      }
      
      return builder.finish();
    }
  }
  
  return ViewPlugin.fromClass(IndentGuidesPlugin, {
    decorations: plugin => plugin.decorations,
  });
}

// CSS theme for indent guides
const indentGuidesTheme = EditorView.baseTheme({
  '.indent-guide': {
    position: 'relative',
  },
  '.indent-guide::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '1px',
    pointerEvents: 'none',
  },
  '.indent-level-0::before': { left: '2ch' },
  '.indent-level-1::before': { left: '4ch' },
  '.indent-level-2::before': { left: '6ch' },
  '.indent-level-3::before': { left: '8ch' },
  '.indent-level-4::before': { left: '10ch' },
  '.indent-level-5::before': { left: '12ch' },
  '.indent-level-6::before': { left: '14ch' },
  '.indent-level-7::before': { left: '16ch' },
  '.indent-level-8::before': { left: '18ch' },
  '.indent-level-9::before': { left: '20ch' },
  
  // Active scope highlighting
  '.active-indent::before': {
    opacity: 1,
  },
  '.empty-line .indent-guide': {
    opacity: 0.4,
  },
});

// Enhanced version with better performance and options
export function indentGuidesExtension(options = {}) {
  const {
    highlightActive = true,
    colors,
    renderEmptyLines = true,
    renderBlankLines = false,
  } = options;
  
  return [
    indentGuides({ highlightActive, colors }),
    indentGuidesTheme,
    EditorView.theme({
      // Ensure guides don't interfere with text
      '&.cm-editor .cm-line': {
        position: 'relative',
        zIndex: 1,
      },
    }),
  ];
}

// Utility function to get indent level at position
export function getIndentLevelAt(view, pos) {
  const line = view.state.doc.lineAt(pos);
  const text = line.text;
  const tabSize = view.state.tabSize;
  
  let indent = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\t') {
      indent += tabSize - (indent % tabSize);
      i++;
    } else if (text[i] === ' ') {
      indent++;
      i++;
    } else {
      break;
    }
  }
  
  return Math.floor(indent / tabSize);
}

// Utility function to get scope range for current line
export function getCurrentScopeRange(view) {
  const cursorPos = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(cursorPos).number - 1;
  const doc = view.state.doc;
  const tabSize = view.state.tabSize;
  
  const indentLevels = new Map();
  const lineCount = doc.lines;
  
  for (let lineNum = 0; lineNum < lineCount; lineNum++) {
    const line = doc.line(lineNum + 1);
    const text = line.text;
    
    let indent = 0;
    let i = 0;
    while (i < text.length) {
      if (text[i] === '\t') {
        indent += tabSize - (indent % tabSize);
        i++;
      } else if (text[i] === ' ') {
        indent++;
        i++;
      } else {
        break;
      }
    }
    
    indentLevels.set(lineNum, Math.floor(indent / tabSize));
  }
  
  const currentLevel = indentLevels.get(cursorLine) || 0;
  
  // Find scope start
  let startLine = cursorLine;
  for (let i = cursorLine - 1; i >= 0; i--) {
    if (indentLevels.get(i) < currentLevel) {
      startLine = i + 1;
      break;
    }
    if (i === 0) {
      startLine = 0;
    }
  }
  
  // Find scope end
  let endLine = cursorLine;
  for (let i = cursorLine + 1; i < lineCount; i++) {
    if (indentLevels.get(i) < currentLevel) {
      endLine = i - 1;
      break;
    }
    if (i === lineCount - 1) {
      endLine = lineCount - 1;
    }
  }
  
  return {
    start: doc.line(startLine + 1).from,
    end: doc.line(endLine + 1).to,
    startLine,
    endLine,
    level: currentLevel,
  };
}
