import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDaylight, createDispatch, fetchUserProfile } from '../api/client';
import { Sun, Sunset, Moon, Sparkles, ArrowRight, Minus, Plus, Compass } from 'lucide-react';

export default function DeskBreaker() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [daylight, setDaylight] = useState(null);
  const [coords, setCoords] = useState(null);
  const [preMood, setPreMood] = useState(4);
  const [targetMin, setTargetMin] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Request browser location for accurate sunset calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation declined or unavailable. Using default coordinates.', err);
          setCoords(null);
        }
      );
    }

    fetchUserProfile()
      .then(setProfile)
      .catch((e) => console.warn('Could not fetch user profile:', e));
  }, []);

  useEffect(() => {
    fetchDaylight(coords?.lat, coords?.lon)
      .then((data) => {
        setDaylight(data);
        if (data.recommended_duration_min) {
          setTargetMin(data.recommended_duration_min);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error('Daylight fetch error:', e);
        setLoading(false);
      });
  }, [coords]);

  const handleStartRun = async () => {
    setIsGenerating(true);
    try {
      const dispatchData = await createDispatch(preMood, coords?.lat, coords?.lon, targetMin);
      navigate('/outdoor', {
        state: {
          dispatch: dispatchData,
          initialDurationMin: targetMin,
          moodPre: preMood,
        },
      });
    } catch (err) {
      console.error('Failed to create dispatch:', err);
      // Fallback local run session even if offline
      navigate('/outdoor', {
        state: {
          dispatch: {
            run_id: `run_offline_${Date.now()}`,
            prompt_text:
              'Good afternoon, Mr. Wick. Leave the screen behind. Find a steady, rhythmic cadence through the dusk.',
            audio_base64: null,
            target_duration_min: targetMin,
            daylight_minutes_remaining: daylight?.minutes_remaining || 45,
          },
          initialDurationMin: targetMin,
          moodPre: preMood,
        },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-xl mx-auto space-y-7 py-2">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-center justify-between text-xs tracking-wider uppercase text-primary font-mono mb-2">
          <span>Concierge Dispatch</span>
          <span>Standby</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-text-main font-semibold tracking-tight">
          {getGreeting()}, Mr. Wick.
        </h1>
        <p className="text-text-muted mt-2 text-base leading-relaxed">
          The desk has held you long enough. Step outside into the fading light.
        </p>
      </div>

      {/* Daylight Status Card */}
      <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-surface-subtle border border-border text-primary">
              {daylight?.is_golden_hour ? (
                <Sunset className="w-5 h-5 text-amber-400" />
              ) : daylight?.minutes_remaining > 0 ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted font-mono">
                Astronomical Daylight
              </div>
              <div className="text-lg font-display font-semibold text-text-main">
                {daylight ? daylight.status : 'Observing skies...'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-display font-bold tabular-nums text-primary">
              {daylight ? daylight.minutes_remaining : '--'}
              <span className="text-sm font-normal text-text-muted ml-1">min</span>
            </div>
            <div className="text-[11px] text-text-muted font-mono">until sunset</div>
          </div>
        </div>

        {daylight?.is_golden_hour && (
          <div className="mt-4 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Golden hour window is active. Ideal timing for mindful cadence.</span>
          </div>
        )}
      </div>

      {/* Pre-Run Mood Check & Duration Adjustment */}
      <div className="bg-surface border border-border/80 rounded-2xl p-5 space-y-5 shadow-sm">
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-sm font-display font-medium text-text-main">
              Current Mental State (Pre-Run)
            </label>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-surface-subtle text-primary border border-border">
              {preMood}/10 — {preMood <= 3 ? 'Exhausted' : preMood <= 6 ? 'Desk Fatigue' : 'Ready'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={preMood}
            onChange={(e) => setPreMood(Number(e.target.value))}
            className="w-full accent-primary bg-surface-subtle rounded-lg cursor-pointer h-2"
          />
          <div className="flex justify-between text-[11px] text-text-muted mt-2 font-mono">
            <span>1 (Tense & bound to screen)</span>
            <span>10 (Invigorated)</span>
          </div>
        </div>

        {/* Target Session Duration */}
        <div className="pt-4 border-t border-border/40">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="font-display font-medium text-sm text-text-main">Session Objective</div>
              <div className="text-[11px] text-text-muted">Targeted outdoor stride time</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTargetMin(Math.max(15, targetMin - 5))}
                className="p-1.5 rounded-lg border border-border bg-surface-subtle hover:bg-border text-text-main transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-display text-lg font-bold tabular-nums text-primary w-12 text-center">
                {targetMin}m
              </span>
              <button
                type="button"
                onClick={() => setTargetMin(Math.min(90, targetMin + 5))}
                className="p-1.5 rounded-lg border border-border bg-surface-subtle hover:bg-border text-text-main transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {[20, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => setTargetMin(m)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-mono transition-colors ${
                  targetMin === m
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-surface-subtle text-text-muted hover:text-text-main'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleStartRun}
        disabled={isGenerating || loading}
        className="w-full py-3.5 px-6 bg-primary text-slate-950 hover:bg-primary-hover font-display font-semibold text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 active:scale-[0.99]"
      >
        {isGenerating ? (
          <>
            <Compass className="w-4 h-4 animate-spin" />
            <span>Consulting Concierge...</span>
          </>
        ) : (
          <>
            <span>Step Outside — Receive Dispatch</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Profile Summary Badge */}
      {profile && (
        <div className="text-center text-xs text-text-muted font-mono tracking-wider">
          {profile.total_runs} RUNS LOGGED · {profile.streak_days}-DAY STREAK
        </div>
      )}
    </div>
  );
}
