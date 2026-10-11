import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useRecorder } from '../hooks/useRecorder';
import SpotifyEmbed from './SpotifyEmbed';
import { completeRun } from '../api/client';
import {
  Volume2,
  VolumeX,
  Mic,
  Square,
  CheckCircle2,
  Eye,
  EyeOff,
  CloudUpload,
  Wifi,
  WifiOff,
  Send,
  Sparkles,
} from 'lucide-react';

export default function OutdoorMode() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const dispatch = state.dispatch || {
    run_id: `run_${Date.now()}`,
    prompt_text: 'Good afternoon, Mr. Wick. Clear the slate and find steady cadence.',
    audio_base64: null,
    target_duration_min: 45,
    daylight_minutes_remaining: 45,
  };

  const targetSeconds = (state.initialDurationMin || dispatch.target_duration_min || 45) * 60;
  const runId = dispatch.run_id;

  // Timestamps for accurate never-pausing timer
  const startTimeRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Visibility tracking (Page Visibility API)
  const [visibilityState, setVisibilityState] = useState(
    document.hidden ? 'pocket' : 'screen'
  );
  const [pocketSeconds, setPocketSeconds] = useState(0);
  const [screenSeconds, setScreenSeconds] = useState(0);
  const visibilityEventsRef = useRef([]);
  const lastStateChangeRef = useRef({ state: document.hidden ? 'pocket' : 'screen', time: Date.now() });

  // Completion modal state
  const [isFinishing, setIsFinishing] = useState(false);
  const [postMood, setPostMood] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field log note input (text + audio)
  const [manualNote, setManualNote] = useState('');
  const [recentLogs, setRecentLogs] = useState([]);

  // Audio dispatch state (prevent repeated looping & provide mute button)
  const [isPlayingDispatch, setIsPlayingDispatch] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const hasPlayedOnceRef = useRef(false);
  const audioPlayerRef = useRef(null);

  // Hooks for offline field logging
  const { isOnline, queue, enqueueFieldLog } = useOfflineQueue(runId);
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder();

  // Stop/mute speech or audio
  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingDispatch(false);
  };

  // Play ElevenLabs audio or browser speech synthesis
  const playDispatchAudio = () => {
    if (isMuted) return;

    // Stop previous instance before playing
    stopAudio();

    if (dispatch.audio_base64) {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(`data:audio/mpeg;base64,${dispatch.audio_base64}`);
        audioPlayerRef.current.onended = () => setIsPlayingDispatch(false);
      }
      setIsPlayingDispatch(true);
      audioPlayerRef.current.play().catch((e) => {
        console.warn('Audio play prevented:', e);
        setIsPlayingDispatch(false);
      });
    } else if ('speechSynthesis' in window) {
      setIsPlayingDispatch(true);
      const utterance = new SpeechSynthesisUtterance(dispatch.prompt_text);
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      utterance.onend = () => setIsPlayingDispatch(false);
      utterance.onerror = () => setIsPlayingDispatch(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle mute / speech playback
  const toggleAudio = () => {
    if (isPlayingDispatch) {
      stopAudio();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      playDispatchAudio();
    }
  };

  // Run ONCE on mount
  useEffect(() => {
    if (!hasPlayedOnceRef.current) {
      hasPlayedOnceRef.current = true;
      playDispatchAudio();
    }

    return () => {
      stopAudio();
    };
  }, []);

  // Timestamp-derived Never-pausing timer & Page Visibility logger
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedSeconds(totalElapsed);

      if (document.hidden) {
        setPocketSeconds((prev) => prev + 1);
      } else {
        setScreenSeconds((prev) => prev + 1);
      }
    }, 1000);

    const handleVisibilityChange = () => {
      const isPocket = document.hidden;
      const newState = isPocket ? 'pocket' : 'screen';
      const now = Date.now();
      const prev = lastStateChangeRef.current;
      const duration = (now - prev.time) / 1000;

      visibilityEventsRef.current.push({
        state: prev.state,
        timestamp: new Date(prev.time).toISOString(),
        duration_s: duration,
      });

      lastStateChangeRef.current = { state: newState, time: now };
      setVisibilityState(newState);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timerInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressRatio = Math.min(1, elapsedSeconds / Math.max(1, targetSeconds));
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const handleSaveFieldLog = async (blobToSave = audioBlob, textToSave = manualNote) => {
    if (!blobToSave && !textToSave.trim()) return;

    const clientId = `client_${Date.now()}`;
    const newEntry = {
      clientId,
      text: textToSave.trim() || 'Audio observation',
      status: isOnline ? 'Processing...' : 'Queued (Offline)',
      timestamp: new Date().toLocaleTimeString(),
    };

    setRecentLogs((prev) => [newEntry, ...prev]);
    setManualNote('');
    resetRecording();

    await enqueueFieldLog(clientId, blobToSave, textToSave.trim(), runId);
  };

  const handleFinishSession = async () => {
    setIsSubmitting(true);
    stopAudio();
    const payload = {
      mood_post: postMood,
      elapsed_s: elapsedSeconds,
      pocket_s: pocketSeconds,
      screen_s: screenSeconds,
      visibility_events: visibilityEventsRef.current,
    };

    try {
      await completeRun(runId, payload);
    } catch (err) {
      console.warn('Run completed locally:', err);
    } finally {
      setIsSubmitting(false);
      navigate('/stats');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-2">
      {/* Top Status Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs font-mono tracking-wider">
          {visibilityState === 'pocket' ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Pocket Stride</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-primary">
              <Eye className="w-3.5 h-3.5" />
              <span>Screen Active</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <WifiOff className="w-3.5 h-3.5" /> Offline Sync
            </span>
          )}

          {queue.length > 0 && (
            <span className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <CloudUpload className="w-3 h-3 animate-bounce" />
              {queue.length} in IDB
            </span>
          )}
        </div>
      </div>

      {/* Atmospheric Dispatch Banner with Mute / Replay Control */}
      <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-primary font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Concierge Dispatch</span>
            </div>
            <p className="text-sm text-text-main leading-relaxed">
              "{dispatch.prompt_text}"
            </p>
          </div>

          <button
            onClick={toggleAudio}
            className={`p-2.5 rounded-xl border transition-all shrink-0 ${
              isPlayingDispatch
                ? 'bg-primary text-slate-950 border-primary shadow-sm'
                : 'bg-surface-subtle text-text-muted hover:text-text-main border-border'
            }`}
            title={isPlayingDispatch ? 'Mute Dispatch' : 'Play Dispatch'}
          >
            {isPlayingDispatch ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Big Never-Pausing Tabular Timer with Brass Progress Ring */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="rgb(var(--color-surface-subtle))"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Brass / Primary progress ring */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="rgb(var(--color-primary))"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>

          {/* Central Timer Face */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-text-main tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted mt-1">
              Target: {formatTime(targetSeconds)}
            </span>
            <span className="text-[11px] font-mono text-primary/80 mt-1.5">
              Pocket: {formatTime(pocketSeconds)} · Screen: {formatTime(screenSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Cadence Music Player */}
      <SpotifyEmbed />

      {/* Field Note & Voice Observation Module */}
      <div className="bg-surface border border-border/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-display font-semibold text-text-main">
            Field Log & Environmental Notes
          </div>
          <span className="text-[11px] text-text-muted font-mono">Offline Storage Ready</span>
        </div>

        {/* Voice recording controls */}
        <div className="flex items-center gap-2.5">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex-1 py-2.5 px-3 rounded-xl border border-border bg-surface-subtle hover:bg-border text-text-main font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Mic className="w-4 h-4 text-primary" />
              <span>Record Voice Note</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Recording ({recordingDuration}s)</span>
            </button>
          )}

          {audioBlob && !isRecording && (
            <button
              onClick={() => handleSaveFieldLog(audioBlob, manualNote)}
              className="py-2.5 px-3.5 rounded-xl bg-primary text-slate-950 font-semibold text-xs flex items-center gap-1.5 hover:bg-primary-hover shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}
        </div>

        {/* Text note input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Or type a quick sensory observation..."
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveFieldLog(null, manualNote);
            }}
            className="flex-1 bg-surface-subtle border border-border rounded-xl px-3 py-2 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={() => handleSaveFieldLog(null, manualNote)}
            disabled={!manualNote.trim()}
            className="p-2 rounded-xl border border-border bg-surface-subtle hover:bg-border disabled:opacity-40 text-primary transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent session notes */}
        {recentLogs.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            {recentLogs.map((log, i) => (
              <div
                key={i}
                className="text-xs p-2 rounded-xl bg-surface-subtle border border-border/40 flex justify-between items-center"
              >
                <span className="text-text-main italic truncate mr-2">"{log.text}"</span>
                <span className="text-text-muted font-mono text-[10px] shrink-0">{log.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Run Trigger */}
      <button
        onClick={() => setIsFinishing(true)}
        className="w-full py-3.5 rounded-2xl bg-surface hover:bg-surface-subtle text-text-main border border-primary/50 font-display font-medium text-base shadow-sm transition-all flex items-center justify-center gap-2 active:scale-99"
      >
        <CheckCircle2 className="w-4 h-4 text-primary" />
        <span>Conclude Session</span>
      </button>

      {/* Completion Modal */}
      {isFinishing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="font-display text-xl font-bold text-text-main">
                Stride Concluded
              </h2>
              <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
                Total Session: {formatTime(elapsedSeconds)}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-display font-medium text-text-main">
                  Post-Run Mental State
                </label>
                <span className="text-xs font-mono text-primary font-bold">
                  {postMood}/10 (Δ +{Math.max(0, postMood - (state.moodPre || 4))})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={postMood}
                onChange={(e) => setPostMood(Number(e.target.value))}
                className="w-full accent-primary bg-surface-subtle rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>1 (Fatigued)</span>
                <span>10 (Invigorated)</span>
              </div>
            </div>

            <div className="bg-surface-subtle rounded-2xl p-3 border border-border/50 text-xs font-mono space-y-1">
              <div className="flex justify-between text-text-muted">
                <span>Pocket time:</span>
                <span className="text-text-main">{formatTime(pocketSeconds)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Screen time:</span>
                <span className="text-text-main">{formatTime(screenSeconds)}</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setIsFinishing(false)}
                className="flex-1 py-2.5 rounded-xl border border-border bg-surface-subtle text-text-muted hover:text-text-main font-medium text-xs transition-colors"
              >
                Return
              </button>
              <button
                onClick={handleFinishSession}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-primary text-slate-950 font-semibold text-xs hover:bg-primary-hover shadow-md transition-transform active:scale-95"
              >
                {isSubmitting ? 'Logging...' : 'Save & View Stats'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
