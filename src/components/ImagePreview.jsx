import React, { useState } from 'react';
import { Image, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'];

export function isImageFile(extension) {
  return IMAGE_EXTENSIONS.includes((extension || '').toLowerCase());
}

export default function ImagePreview({ file }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const getImageSrc = () => {
    if (file.extension === 'svg' && file.content) {
      try {
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(file.content)))}`;
      } catch { return null; }
    }
    // Tauri asset protocol
    const path = file.path.replace(/\\/g, '/');
    return `https://asset.localhost/${encodeURIComponent(path)}`;
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-lorica-border bg-lorica-surface/50">
        <Image size={14} className="text-lorica-accent" />
        <span className="text-xs text-lorica-text font-medium">{file.name}</span>
        <div className="flex-1" />
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.25))} className="p-1 text-lorica-textDim hover:text-lorica-text rounded hover:bg-lorica-panel/50">
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] text-lorica-textDim w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="p-1 text-lorica-textDim hover:text-lorica-text rounded hover:bg-lorica-panel/50">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => setRotation(r => r + 90)} className="p-1 text-lorica-textDim hover:text-lorica-text rounded hover:bg-lorica-panel/50">
          <RotateCw size={14} />
        </button>
        <button onClick={() => { setZoom(1); setRotation(0); }} className="px-2 py-0.5 text-[10px] text-lorica-textDim hover:text-lorica-text bg-lorica-bg rounded border border-lorica-border">
          Reset
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        style={{ background: 'repeating-conic-gradient(var(--color-panel) 0% 25%, var(--color-bg) 0% 50%) 50% / 20px 20px' }}
      >
        {loadError ? (
          <div className="text-center text-lorica-textDim text-xs">
            <div className="text-4xl mb-2 opacity-20">🖼️</div>
            <div>Cannot preview this image</div>
            <div className="text-[10px] mt-1 opacity-50">{file.path}</div>
          </div>
        ) : (
          <img
            src={getImageSrc()}
            alt={file.name}
            className="max-w-none transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
            }}
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </div>
  );
}
