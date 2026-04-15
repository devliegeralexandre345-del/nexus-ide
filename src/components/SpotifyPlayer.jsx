import React, { useState } from 'react';
import { Music, ExternalLink, Link2 } from 'lucide-react';

export default function SpotifyPlayer({ spotify }) {
  const { currentPlaylist, playlists, selectPlaylist, setCustomPlaylist, getEmbedUrl } = spotify;
  const [customUrl, setCustomUrl] = useState('');
  const [showPlaylists, setShowPlaylists] = useState(false);

  const handleCustomSubmit = () => {
    if (customUrl.trim()) {
      const ok = setCustomPlaylist(customUrl.trim());
      if (ok) setCustomUrl('');
    }
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Music size={12} className="text-lorica-spotify" />
          <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Spotify</span>
        </div>
        <button
          onClick={() => setShowPlaylists(!showPlaylists)}
          className="text-[10px] text-lorica-textDim hover:text-lorica-spotify transition-colors"
        >
          {showPlaylists ? 'Hide' : 'Playlists'}
        </button>
      </div>

      {/* Playlist selector */}
      {showPlaylists && (
        <div className="px-2 pb-2 space-y-1">
          {playlists.map((pl) => (
            <button
              key={pl.embedId}
              onClick={() => selectPlaylist(pl)}
              className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors ${
                currentPlaylist?.embedId === pl.embedId
                  ? 'bg-lorica-spotify/20 text-lorica-spotify'
                  : 'text-lorica-textDim hover:text-lorica-text hover:bg-lorica-panel'
              }`}
            >
              🎵 {pl.name}
            </button>
          ))}
          {/* Custom URL */}
          <div className="flex items-center gap-1 mt-1">
            <div className="flex-1 flex items-center gap-1 bg-lorica-bg rounded border border-lorica-border px-2 py-0.5">
              <Link2 size={10} className="text-lorica-textDim" />
              <input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Paste Spotify URL..."
                className="flex-1 bg-transparent text-[10px] text-lorica-text outline-none placeholder:text-lorica-textDim/50"
              />
            </div>
            <button onClick={handleCustomSubmit} className="text-lorica-spotify text-[10px] px-1">Go</button>
          </div>
        </div>
      )}

      {/* Spotify Embed */}
      {embedUrl && (
        <div className="px-2 pb-2">
          <iframe
            src={embedUrl}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
            style={{ borderRadius: '12px' }}
          />
        </div>
      )}
    </div>
  );
}
