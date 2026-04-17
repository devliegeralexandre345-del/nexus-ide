// src/components/previews/DocxPreview.jsx
//
// Uses mammoth.js to convert DOCX → clean HTML, then renders it inside a styled
// container. Reads raw bytes via the Tauri binary-file bridge.

import React, { useEffect, useState } from 'react';
import { Loader2, FileText, AlertTriangle } from 'lucide-react';

export default function DocxPreview({ file }) {
  const [html, setHtml] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      setWarnings([]);
      try {
        const r = await window.lorica.fs.readFileBytes(file.path);
        if (!active) return;
        if (!r.success) throw new Error(r.error || 'Read failed');
        const bytes = r.data instanceof Uint8Array ? r.data : new Uint8Array(r.data);

        // Lazy-load mammoth — it's ~500KB and we don't want it in the main bundle.
        const mammoth = await import('mammoth/mammoth.browser');
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        if (!active) return;
        setHtml(result.value || '');
        setWarnings((result.messages || []).map((m) => m.message).slice(0, 10));
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [file.path]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center text-lorica-textDim">
        <Loader2 size={18} className="animate-spin mr-2" /> Conversion du document…
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-lorica-textDim text-xs">
        <FileText size={32} className="opacity-20 mb-2" />
        <div>Impossible d'ouvrir le document</div>
        <div className="text-[10px] opacity-60 mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto" style={{ background: 'var(--color-panel)' }}>
      {warnings.length > 0 && (
        <div className="mx-4 mt-4 mb-2 p-2 rounded border border-yellow-700/40 bg-yellow-900/10 text-[10px] text-yellow-300/80 flex items-start gap-2">
          <AlertTriangle size={11} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">Avertissements de conversion :</div>
            <ul className="list-disc list-inside space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}
      <div
        className="mx-auto my-6 max-w-3xl bg-white text-gray-900 p-10 rounded shadow-lg docx-preview-body"
        style={{ minHeight: '80%' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .docx-preview-body h1 { font-size: 1.75rem; font-weight: 700; margin: 1rem 0 0.75rem; }
        .docx-preview-body h2 { font-size: 1.4rem;  font-weight: 700; margin: 1rem 0 0.5rem; }
        .docx-preview-body h3 { font-size: 1.15rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
        .docx-preview-body p { margin: 0.5rem 0; line-height: 1.6; }
        .docx-preview-body ul, .docx-preview-body ol { margin: 0.5rem 0 0.5rem 1.5rem; }
        .docx-preview-body li { margin: 0.2rem 0; }
        .docx-preview-body table { border-collapse: collapse; margin: 1rem 0; }
        .docx-preview-body td, .docx-preview-body th { border: 1px solid #ccc; padding: 4px 8px; }
        .docx-preview-body img { max-width: 100%; height: auto; }
        .docx-preview-body a { color: #0066cc; text-decoration: underline; }
      `}</style>
    </div>
  );
}
