import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function Terminal() {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const root = getComputedStyle(document.documentElement);
    const bg = root.getPropertyValue('--color-bg').trim() || '#06080f';
    const fg = root.getPropertyValue('--color-text').trim() || '#e2e8f0';
    const accent = root.getPropertyValue('--color-accent').trim() || '#00d4ff';

    const term = new XTerminal({
      theme: {
        background: bg,
        foreground: fg,
        cursor: accent,
        cursorAccent: bg,
        selectionBackground: accent + '33',
        black: bg,
        red: '#ff3b5c',
        green: '#00e68a',
        yellow: '#ffb020',
        blue: accent,
        magenta: '#c792ea',
        cyan: '#89ddff',
        white: fg,
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowTransparency: false,
      drawBoldTextInBrightColors: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    termRef.current = term;

    // Fit after render
    setTimeout(() => fitAddon.fit(), 50);

    // Initialize PTY
    (async () => {
      if (!window.lorica?.terminal) { showFallback(term); return; }

      try {
        await window.lorica.terminal.onData((data) => term.write(data));
        const result = await window.lorica.terminal.create();

        if (result && result.success !== false && result.data !== undefined) {
          term.onData((data) => window.lorica.terminal.write(data));
        } else {
          term.writeln(`\x1b[33m⚠ PTY: ${result?.error || 'unavailable'}\x1b[0m`);
          showFallback(term);
        }
      } catch (e) {
        term.writeln(`\x1b[31m✗ ${e}\x1b[0m`);
        showFallback(term);
      }
    })();

    // Resize
    const observer = new ResizeObserver(() => {
      setTimeout(() => {
        fitAddon.fit();
        window.lorica?.terminal?.resize(term.cols, term.rows);
      }, 30);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      window.lorica?.terminal?.removeDataListener();
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-3 py-1 border-b border-lorica-border/50">
        <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Terminal</span>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden terminal-container" />
    </div>
  );
}

function showFallback(term) {
  term.writeln('\x1b[90m── Fallback mode ──\x1b[0m');
  let line = '';
  term.write('\x1b[36m$ \x1b[0m');
  term.onData((data) => {
    if (data === '\r') {
      term.writeln('');
      if (line.trim()) term.writeln(`\x1b[90m[echo] ${line}\x1b[0m`);
      line = '';
      term.write('\x1b[36m$ \x1b[0m');
    } else if (data === '\x7f') {
      if (line.length > 0) { line = line.slice(0, -1); term.write('\b \b'); }
    } else {
      line += data;
      term.write(data);
    }
  });
}

