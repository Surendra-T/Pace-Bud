import React from 'react';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import { Music, Play, Pause, SkipForward, SkipBack, ExternalLink, LogOut } from 'lucide-react';

const DEFAULT_PLAYLIST =
  import.meta.env.VITE_SPOTIFY_DEFAULT_PLAYLIST ||
  'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM';

export default function SpotifyEmbed() {
  const {
    isConfigured,
    token,
    isPremium,
    isPlaying,
    trackInfo,
    loginSpotify,
    togglePlay,
    nextTrack,
    prevTrack,
    logout,
  } = useSpotifyAuth();

  // Convert standard playlist URL to embed format if needed
  const getEmbedUrl = (url) => {
    if (url.includes('/embed/')) return url;
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  };

  const embedSrc = getEmbedUrl(DEFAULT_PLAYLIST);

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary font-display font-medium text-sm">
          <Music className="w-4 h-4" />
          <span>Cadence Accompaniment</span>
        </div>

        {/* If user configured Spotify OAuth client ID, show connect option */}
        {isConfigured && (
          <div>
            {!token ? (
              <button
                onClick={loginSpotify}
                className="text-xs px-2.5 py-1 bg-surface-subtle hover:bg-border text-text-main rounded border border-border flex items-center gap-1.5 transition-colors"
              >
                <span>Connect Spotify Premium</span>
                <ExternalLink className="w-3 h-3 text-primary" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Premium Connected</span>
                <button
                  onClick={logout}
                  title="Disconnect Spotify"
                  className="p-1 hover:text-red-400 text-text-muted transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium Web Playback SDK Active Player */}
      {token && isPremium ? (
        <div className="bg-surface-subtle rounded-lg p-3.5 border border-border/60">
          <div className="flex items-center justify-between">
            <div className="truncate pr-3">
              <div className="text-sm font-medium text-text-main truncate">
                {trackInfo ? trackInfo.name : 'Pace-Bud Rhythm Stream'}
              </div>
              <div className="text-xs text-text-muted truncate">
                {trackInfo
                  ? trackInfo.artists.map((a) => a.name).join(', ')
                  : 'Ready on Pace-Bud Device'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevTrack}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-full transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="p-2 bg-primary text-slate-900 rounded-full hover:bg-primary-hover transition-transform active:scale-95 shadow"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                onClick={nextTrack}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-full transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Zero-Auth Default Embed iframe */
        <div className="rounded-lg overflow-hidden border border-border/40">
          <iframe
            src={embedSrc}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify Cadence Embed"
            className="rounded-lg"
          ></iframe>
        </div>
      )}
    </div>
  );
}
