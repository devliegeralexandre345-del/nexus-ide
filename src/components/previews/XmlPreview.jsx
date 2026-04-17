// src/components/previews/XmlPreview.jsx
//
// Parses XML with the browser's DOMParser and renders it as a collapsible
// tree. Shows attributes inline; text nodes are grouped on the tag line when
// short, on their own row when long.

import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, FileCode } from 'lucide-react';

function XmlNode({ node, depth = 0, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  // Text node
  if (node.nodeType === 3 /* Node.TEXT_NODE */) {
    const txt = (node.nodeValue || '').trim();
    if (!txt) return null;
    return (
      <div className="pl-4 text-[11px] text-lorica-text/80 break-words">
        <span className="text-lorica-textDim mr-1">»</span>
        {txt.length > 200 ? txt.slice(0, 200) + '…' : txt}
      </div>
    );
  }

  // Comment
  if (node.nodeType === 8) {
    return (
      <div className="pl-4 text-[10px] text-lorica-textDim italic">
        &lt;!-- {(node.nodeValue || '').trim().slice(0, 140)} --&gt;
      </div>
    );
  }

  if (node.nodeType !== 1 /* ELEMENT */) return null;

  const children = Array.from(node.childNodes).filter((c) => {
    if (c.nodeType === 3) return (c.nodeValue || '').trim().length > 0;
    return c.nodeType === 1 || c.nodeType === 8;
  });

  const hasChildren = children.length > 0;
  const attrs = Array.from(node.attributes || []);

  // Inline short text when the element has ONE text child and nothing else
  const onlyTextChild = children.length === 1 && children[0].nodeType === 3 ? (children[0].nodeValue || '').trim() : null;

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={`flex items-start gap-1 px-1 py-0.5 rounded hover:bg-lorica-panel/40 ${hasChildren ? 'cursor-pointer' : ''}`}
      >
        <span className="shrink-0 w-3 text-lorica-textDim">
          {hasChildren ? (open ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : null}
        </span>
        <div className="text-[11px] font-mono leading-tight flex-1 min-w-0">
          <span className="text-lorica-textDim">&lt;</span>
          <span className="text-blue-400">{node.nodeName}</span>
          {attrs.map((a, i) => (
            <span key={i}>
              {' '}
              <span className="text-yellow-400">{a.name}</span>
              <span className="text-lorica-textDim">=</span>
              <span className="text-green-400">"{a.value}"</span>
            </span>
          ))}
          <span className="text-lorica-textDim">{onlyTextChild && !open ? '' : hasChildren ? '>' : ' />'}</span>
          {onlyTextChild && onlyTextChild.length < 80 && (
            <>
              <span className="text-lorica-text">{onlyTextChild}</span>
              <span className="text-lorica-textDim">&lt;/</span>
              <span className="text-blue-400">{node.nodeName}</span>
              <span className="text-lorica-textDim">&gt;</span>
            </>
          )}
        </div>
      </div>

      {open && hasChildren && !(onlyTextChild && onlyTextChild.length < 80) && (
        <div className="pl-4 border-l border-lorica-border/40 ml-1.5">
          {children.map((child, i) => (
            <XmlNode key={i} node={child} depth={depth + 1} defaultOpen={depth < 2} />
          ))}
          <div className="text-[11px] font-mono text-lorica-textDim pl-1">
            &lt;/<span className="text-blue-400">{node.nodeName}</span>&gt;
          </div>
        </div>
      )}
    </div>
  );
}

export default function XmlPreview({ file }) {
  const { doc, error } = useMemo(() => {
    if (!file?.content) return { doc: null, error: null };
    try {
      const parser = new DOMParser();
      const d = parser.parseFromString(file.content, 'application/xml');
      const parseErr = d.querySelector('parsererror');
      if (parseErr) return { doc: null, error: parseErr.textContent || 'XML parse error' };
      return { doc: d, error: null };
    } catch (e) {
      return { doc: null, error: e.message };
    }
  }, [file?.content]);

  const [search, setSearch] = useState('');
  const matchCount = useMemo(() => {
    if (!doc || !search) return 0;
    const needle = search.toLowerCase();
    let count = 0;
    const walk = (n) => {
      if (n.nodeType === 1 && n.nodeName.toLowerCase().includes(needle)) count++;
      n.childNodes && Array.from(n.childNodes).forEach(walk);
    };
    walk(doc.documentElement);
    return count;
  }, [doc, search]);

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle size={24} className="text-red-400 mb-2" />
        <div className="text-xs text-lorica-text mb-1">XML invalide</div>
        <div className="text-[10px] text-lorica-textDim max-w-md break-words">{error}</div>
      </div>
    );
  }
  if (!doc) {
    return <div className="h-full flex items-center justify-center text-xs text-lorica-textDim">Aucun contenu</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-lorica-border bg-lorica-surface/30 shrink-0">
        <FileCode size={11} className="text-lorica-accent" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par nom de balise…"
          className="flex-1 bg-lorica-bg border border-lorica-border rounded px-2 py-0.5 text-[10px] text-lorica-text outline-none focus:border-lorica-accent"
        />
        {search && (
          <span className="text-[10px] text-lorica-textDim">{matchCount} trouvé</span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono">
        <XmlNode node={doc.documentElement} defaultOpen />
      </div>
    </div>
  );
}
