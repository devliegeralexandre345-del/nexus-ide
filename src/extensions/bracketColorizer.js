import { Decoration, ViewPlugin, MatchDecorator, EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

/**
 * Bracket Pair Colorization - Colors matching brackets with alternating colors
 * Inspired by VS Code's bracket pair colorization feature
 */
const BRACKET_PAIRS = [
  { open: '(', close: ')' },
  { open: '{', close: '}' },
  { open: '[', close: ']' },
  { open: '<', close: '>' },
];

// Neon colors for different nesting levels
const BRACKET_COLORS = [
  'var(--neon-cyan, #00d4ff)',   // Level 0
  'var(--neon-magenta, #ff00ff)', // Level 1
  'var(--neon-yellow, #ffff00)',  // Level 2
  'var(--neon-green, #00ff00)',   // Level 3
  'var(--neon-orange, #ff9900)',  // Level 4
  'var(--neon-pink, #ff66cc)',    // Level 5
  'var(--neon-blue, #3366ff)',    // Level 6
  'var(--neon-purple, #cc66ff)',  // Level 7
];

// Calculate nesting level for each bracket
function calculateBracketLevels(doc) {
  const levels = new Map();
  const stack = [];
  
  for (let pos = 0; pos < doc.length; pos++) {
    const char = doc.sliceString(pos, pos + 1);
    const pair = BRACKET_PAIRS.find(p => p.open === char || p.close === char);
    
    if (!pair) continue;
    
    if (char === pair.open) {
      // Opening bracket
      const level = stack.length;
      levels.set(pos, {
        char,
        level,
        isOpen: true,
        pairIndex: BRACKET_PAIRS.indexOf(pair),
      });
      stack.push({ pos, level, pairIndex: BRACKET_PAIRS.indexOf(pair) });
    } else if (char === pair.close && stack.length > 0) {
      // Closing bracket - find matching open
      const last = stack.pop();
      if (last && last.pairIndex === BRACKET_PAIRS.indexOf(pair)) {
        levels.set(pos, {
          char,
          level: last.level,
          isOpen: false,
          pairIndex: BRACKET_PAIRS.indexOf(pair),
          matchPos: last.pos,
        });
        // Also mark the opening bracket as matched
        if (levels.has(last.pos)) {
          levels.get(last.pos).matchPos = pos;
        }
      }
    }
  }
  
  return levels;
}

// Create bracket decorations
const bracketDecoration = (level, isOpen) => Decoration.mark({
  attributes: {
    style: `color: ${BRACKET_COLORS[level % BRACKET_COLORS.length]}; font-weight: bold;`,
    class: `bracket-pair bracket-level-${level} ${isOpen ? 'bracket-open' : 'bracket-close'}`,
  },
});

function bracketPairColorizer() {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = this.computeDecorations(view);
    }
    
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.computeDecorations(update.view);
      }
    }
    
    computeDecorations(view) {
      const levels = calculateBracketLevels(view.state.doc);
      const builder = new Decoration.SetBuilder();
      
      for (const [pos, info] of levels) {
        const colorIndex = info.level % BRACKET_COLORS.length;
        builder.add(
          pos,
          pos + 1,
          Decoration.mark({
            attributes: {
              style: `color: ${BRACKET_COLORS[colorIndex]}; font-weight: 600;`,
              class: `bracket-pair bracket-level-${info.level} ${info.isOpen ? 'bracket-open' : 'bracket-close'}`,
              'data-bracket-level': info.level.toString(),
              'data-bracket-type': info.isOpen ? 'open' : 'close',
            },
          })
        );
      }
      
      return builder.finish();
    }
  }, {
    decorations: v => v.decorations,
  });
}

// Extension that highlights matching bracket when cursor is near
const bracketMatchHighlight = EditorView.baseTheme({
  '.cm-bracket-match': {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    outline: '1px solid rgba(255, 215, 0, 0.5)',
  },
  '.cm-bracket-match.cm-bracket-highlight': {
    backgroundColor: 'rgba(0, 212, 255, 0.3)',
    outline: '1px solid rgba(0, 212, 255, 0.5)',
  },
});

// Plugin to highlight matching bracket
function bracketMatchHighlighter() {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = Decoration.none;
      this.highlightMatchingBracket(view);
    }
    
    update(update) {
      if (update.selectionSet || update.docChanged) {
        this.highlightMatchingBracket(update.view);
      }
    }
    
    highlightMatchingBracket(view) {
      const cursor = view.state.selection.main.head;
      const doc = view.state.doc;
      
      // Find bracket at cursor position
      let bracketPos = -1;
      let bracketInfo = null;
      const levels = calculateBracketLevels(doc);
      
      // Check character at cursor and one position before
      for (let offset = 0; offset <= 1; offset++) {
        const pos = cursor - offset;
        if (pos >= 0 && pos < doc.length) {
          const char = doc.sliceString(pos, pos + 1);
          const pair = BRACKET_PAIRS.find(p => p.open === char || p.close === char);
          if (pair && levels.has(pos)) {
            bracketPos = pos;
            bracketInfo = levels.get(pos);
            break;
          }
        }
      }
      
      const builder = new Decoration.SetBuilder();
      
      if (bracketInfo && bracketInfo.matchPos !== undefined) {
        // Highlight both matching brackets
        const color = BRACKET_COLORS[bracketInfo.level % BRACKET_COLORS.length];
        const highlightDeco = Decoration.mark({
          attributes: {
            style: `background-color: ${color}20; outline: 1px solid ${color}40;`,
            class: 'cm-bracket-match',
          },
        });
        
        builder.add(bracketPos, bracketPos + 1, highlightDeco);
        builder.add(bracketInfo.matchPos, bracketInfo.matchPos + 1, highlightDeco);
      }
      
      this.decorations = builder.finish();
    }
  }, {
    decorations: v => v.decorations,
  });
}

// Main export - combine both extensions
export function bracketPairColorization() {
  return [
    bracketPairColorizer(),
    bracketMatchHighlighter(),
    bracketMatchHighlight,
    EditorView.baseTheme({
      '.bracket-pair': {
        transition: 'color 0.2s ease',
      },
      '.bracket-pair:hover': {
        filter: 'brightness(1.3)',
      },
    }),
  ];
}

// Utility function to get bracket level at position
export function getBracketLevelAt(view, pos) {
  const levels = calculateBracketLevels(view.state.doc);
  return levels.get(pos)?.level ?? -1;
}

// Utility function to find matching bracket
export function findMatchingBracket(view, pos) {
  const levels = calculateBracketLevels(view.state.doc);
  const info = levels.get(pos);
  return info?.matchPos ?? -1;
}