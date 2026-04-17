// src/components/previews/PdfPreview.jsx
//
// Uses Chromium's built-in PDF viewer via a Blob URL. No pdf.js dependency —
// Tauri's webview is Chromium-based on Win/Mac and WebKitGTK on Linux; both
// ship native PDF rendering.

import React, { useEffect, useState } from 'react';
import { Loader2, FileText, Download } from 'lucide-react';

export default function PdfPreview({ file }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let currentUrl = null;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await window.lorica.fs.readFileBytes(file.path);
        if (!active) return;
        if (!r.success) throw new Error(r.error || 'Read failed');
        // r.data is a Uint8Array (or array of numbers) — build a blob.
        const bytes = r.data instanceof Uint8Array ? r.data : new Uint8Array(r.data);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    return () => {
      active = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [file.path]);

  const handleDownload = async () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = file.name;
    a.click();
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center text-lorica-textDim">
        <Loader2 size={18} className="animate-spin mr-2" /> Chargement du PDF…
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-lorica-textDim text-xs">
        <FileText size={32} className="opacity-20 mb-2" />
        <div>Impossible d'ouvrir le PDF</div>
        <div className="text-[10px] opacity-60 mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-lorica-border bg-lorica-surface/30">
        <FileText size={11} className="text-lorica-accent" />
        <span className="text-[10px] text-lorica-textDim">{file.name}</span>
        <div className="flex-1" />
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel/50"
          title="Télécharger"
        >
          <Download size={10} /> Save
        </button>
      </div>
      <iframe
        src={blobUrl}
        title={file.name}
        className="flex-1 bg-white"
        style={{ border: 0 }}
      />
    </div>
  );
}
