import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import { Music, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback } = useSpotifyAuth();
  const [status, setStatus] = useState('Exchanging PKCE authorization code with Spotify...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const authError = searchParams.get('error');

    if (authError) {
      setError(`Spotify authorization was denied: ${authError}`);
      return;
    }

    if (code) {
      handleAuthCallback(code).then((success) => {
        if (success) {
          setStatus('Connected successfully to Spotify Premium!');
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          setError('Failed to exchange authorization code for access token.');
        }
      });
    } else {
      setError('No authorization code found in URL parameters.');
    }
  }, [searchParams, handleAuthCallback, navigate]);

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-4">
      <div className="p-4 rounded-2xl bg-surface border border-border inline-block shadow-md">
        <Music className="w-10 h-10 text-primary animate-bounce mx-auto" />
      </div>

      <h1 className="font-display text-2xl font-bold text-text-main">
        Spotify Authorization
      </h1>

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{status}</span>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 rounded-xl bg-surface-subtle border border-border text-xs font-mono text-text-muted hover:text-text-main transition-colors"
      >
        Return to Pace-Bud
      </button>
    </div>
  );
}
