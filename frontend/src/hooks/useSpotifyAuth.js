import { useState, useEffect, useCallback } from 'react';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state';

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function useSpotifyAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('spotify_access_token'));
  const [isPremium, setIsPremium] = useState(true);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);

  // Initiate PKCE authorization flow
  const loginSpotify = useCallback(async () => {
    if (!CLIENT_ID) {
      alert('Spotify Client ID not configured.');
      return;
    }
    const verifier = generateRandomString(64);
    localStorage.setItem('spotify_code_verifier', verifier);
    const challenge = await generateCodeChallenge(verifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }, []);

  // Handle PKCE callback code exchange
  const handleAuthCallback = useCallback(async (code) => {
    const verifier = localStorage.getItem('spotify_code_verifier');
    if (!verifier) return false;

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });

    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }
        setToken(data.access_token);
        return true;
      }
    } catch (e) {
      console.error('Spotify token exchange failed:', e);
    }
    return false;
  }, []);

  // Initialize Web Playback SDK when token is present
  useEffect(() => {
    if (!token) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const p = new window.Spotify.Player({
        name: 'Pace-Bud Player',
        getOAuthToken: (cb) => {
          cb(token);
        },
        volume: 0.8,
      });

      p.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id);
      });

      p.addListener('not_ready', () => {
        setDeviceId(null);
      });

      p.addListener('player_state_changed', (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        setTrackInfo(state.track_window.current_track);
      });

      p.addListener('account_error', () => {
        setIsPremium(false);
        console.warn('Spotify account is not Premium. Reverting to embed.');
      });

      p.connect();
      setPlayer(p);
    };

    return () => {
      if (player) player.disconnect();
    };
  }, [token]);

  const togglePlay = () => {
    if (player) player.togglePlay();
  };

  const nextTrack = () => {
    if (player) player.nextTrack();
  };

  const prevTrack = () => {
    if (player) player.previousTrack();
  };

  const logout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_code_verifier');
    localStorage.removeItem('spotify_refresh_token');
    setToken(null);
    if (player) player.disconnect();
  };

  return {
    isConfigured: Boolean(CLIENT_ID),
    token,
    isPremium,
    deviceId,
    isPlaying,
    trackInfo,
    loginSpotify,
    handleAuthCallback,
    togglePlay,
    nextTrack,
    prevTrack,
    logout,
  };
}
