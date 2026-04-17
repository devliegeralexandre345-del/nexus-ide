// src/components/FilePreview.jsx
//
// Central previewer that picks the right renderer based on file extension.
// Each renderer is a standalone component in the same folder — kept split so
// heavy deps (mammoth for DOCX, etc.) are loaded lazily and don't bloat the
// main bundle on every editor open.

import React, { useState } from 'react';
import { Code, Eye } from 'lucide-react';
import Editor from './Editor';
import HtmlPreview from './previews/HtmlPreview';
import PdfPreview from './previews/PdfPreview';
import DocxPreview from './previews/DocxPreview';
import XmlPreview from './previews/XmlPreview';
import SqlSchemaPreview from './previews/SqlSchemaPreview';

// Extensions → renderer id + label
const PREVIEW_MAP = {
  html: { id: 'html', label: 'HTML Preview' },
  htm:  { id: 'html', label: 'HTML Preview' },
  pdf:  { id: 'pdf',  label: 'PDF Preview' },
  docx: { id: 'docx', label: 'Document Preview' },
  xml:  { id: 'xml',  label: 'XML Tree' },
  sql:  { id: 'sql',  label: 'Schema Viewer' },
};

export function hasPreview(extension) {
  return !!PREVIEW_MAP[(extension || '').toLowerCase()];
}

export function getPreviewLabel(extension) {
  return PREVIEW_MAP[(extension || '').toLowerCase()]?.label || 'Preview';
}

/**
 * Renders either the editor or the matching preview, with a toolbar toggle.
 * If the extension has no preview mapping, falls back to the editor.
 */
export default function FilePreview({ file, editorProps }) {
  const ext = (file.extension || '').toLowerCase();
  const entry = PREVIEW_MAP[ext];
  const [mode, setMode] = useState(entry ? 'preview' : 'code');

  // Binary-only formats (PDF/DOCX) shouldn't allow a raw code view — the
  // "content" we have is lossy UTF-8 and would be unreadable garbage.
  const binaryOnly = entry && (entry.id === 'pdf' || entry.id === 'docx');

  const renderPreview = () => {
    if (!entry) return null;
    switch (entry.id) {
      case 'html': return <HtmlPreview file={file} />;
      case 'pdf':  return <PdfPreview file={file} />;
      case 'docx': return <DocxPreview file={file} />;
      case 'xml':  return <XmlPreview file={file} />;
      case 'sql':  return <SqlSchemaPreview file={file} />;
      default:     return null;
    }
  };

  // No preview for this extension — just show the editor directly.
  if (!entry) {
    return <Editor {...editorProps} file={file} />;
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Mode toggle toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-lorica-border bg-lorica-surface/30 shrink-0">
        <button
          onClick={() => setMode('preview')}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors ${
            mode === 'preview'
              ? 'bg-lorica-accent/20 text-lorica-accent'
              : 'text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/50'
          }`}
        >
          <Eye size={11} /> {entry.label}
        </button>
        {!binaryOnly && (
          <button
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors ${
              mode === 'code'
                ? 'bg-lorica-accent/20 text-lorica-accent'
                : 'text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/50'
            }`}
          >
            <Code size={11} /> Source
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-lorica-textDim">{file.name}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'preview' ? renderPreview() : <Editor {...editorProps} file={file} />}
      </div>
    </div>
  );
}
