import React, { useState, useEffect } from 'react';
import { fetchStats } from '../api/client';
import { Activity, Flame, Clock, Heart, TrendingUp, Sun, Sparkles, Terminal, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StatsForNerds() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNerdMode, setIsNerdMode] = useState(false);

  useEffect(() => {
    fetchStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-text-muted font-mono text-xs animate-pulse">
        Retrieving biometrics and stride logs...
      </div>
    );
  }

  const {
    total_runs = 15,
    total_minutes = 645.0,
    avg_mood_delta = 3.6,
    current_streak = 14,
    recent_runs = [],
    mood_vs_daylight = [],
    recent_biometrics = [],
  } = stats || {};

  return (
    <div className="max-w-3xl mx-auto space-y-7 py-2">
      {/* Dynamic Header with Smooth Toggle */}
      <div className="border-b border-border/50 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-primary font-mono mb-1 transition-all">
            {isNerdMode ? 'Deep Telemetry & Biometrics' : 'Overview'}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-main transition-all duration-300">
            {isNerdMode ? 'Stats for Nerds' : 'Running Summary'}
          </h1>
          <p className="text-text-muted text-xs transition-all duration-300">
            {isNerdMode
              ? 'Minute-by-minute cardiovascular curves, daylight correlations, and technical metrics.'
              : 'Your overall streak, outdoor session time, and mental restoration.'}
          </p>
        </div>

        {/* Elegant Toggle Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="p-1 rounded-2xl bg-surface border border-border flex items-center gap-1 shadow-sm">
            <button
              onClick={() => setIsNerdMode(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                !isNerdMode
                  ? 'bg-primary text-slate-950 font-semibold shadow'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Essential
            </button>
            <button
              onClick={() => setIsNerdMode(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                isNerdMode
                  ? 'bg-primary text-slate-950 font-semibold shadow'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>For Nerds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono mb-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Streak</span>
          </div>
          <div className="text-2xl font-display font-bold text-text-main tabular-nums">
            {current_streak} <span className="text-xs font-normal text-text-muted">days</span>
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono mb-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Total Time</span>
          </div>
          <div className="text-2xl font-display font-bold text-text-main tabular-nums">
            {total_minutes} <span className="text-xs font-normal text-text-muted">mins</span>
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mood Boost</span>
          </div>
          <div className="text-2xl font-display font-bold text-emerald-400 tabular-nums">
            +{avg_mood_delta} <span className="text-xs font-normal text-text-muted">pts</span>
          </div>
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono mb-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Total Runs</span>
          </div>
          <div className="text-2xl font-display font-bold text-text-main tabular-nums">
            {total_runs} <span className="text-xs font-normal text-text-muted">runs</span>
          </div>
        </div>
      </div>

      {/* Conditionally rendered or highlighted detailed nerd analytics with smooth opacity */}
      <div className={`space-y-6 transition-all duration-300 ${isNerdMode ? 'opacity-100' : 'opacity-95'}`}>
        {/* Mood Delta vs Daylight Window Bar Chart */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-sm space-y-3.5">
          <div>
            <div className="text-sm font-display font-semibold text-text-main flex items-center gap-2">
              <Sun className="w-4 h-4 text-primary" />
              <span>Mood Decompression vs. Daylight Remaining</span>
            </div>
            <div className="text-[11px] text-text-muted">
              Correlation between natural sunset exposure and subjective mental restoration.
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {mood_vs_daylight.length > 0 ? (
              mood_vs_daylight.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-main">
                      {item.daylight_remaining_min} - {item.daylight_remaining_min + 15} min daylight
                    </span>
                    <span className="text-primary font-bold">
                      +{item.avg_mood_delta} pts ({item.count} sessions)
                    </span>
                  </div>
                  <div className="w-full bg-surface-subtle h-2.5 rounded-full overflow-hidden border border-border/40">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (item.avg_mood_delta / 6) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted font-mono py-2 text-center">
                Awaiting additional daylight correlation records.
              </div>
            )}
          </div>
        </div>

        {/* Biometrics Heart Rate & Elevation Curve (Visible in both or prominent in Nerd mode) */}
        {recent_biometrics.length > 0 && (
          <div className={`bg-surface border border-border/80 rounded-2xl p-5 shadow-sm space-y-3.5 transition-all duration-300 ${!isNerdMode ? 'hidden sm:block' : ''}`}>
            <div>
              <div className="text-sm font-display font-semibold text-text-main flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span>Cardiovascular Curve (Apple Health Biometrics)</span>
              </div>
              <div className="text-[11px] text-text-muted">
                Warm-up → sustained cadence → cool-down telemetry
              </div>
            </div>

            <div className="h-36 flex items-end gap-1 pt-4 pb-2 border-b border-border/40 overflow-x-auto">
              {recent_biometrics.slice(-40).map((b, i) => {
                const hr = b.heart_rate || 140;
                const heightPercent = Math.max(15, Math.min(100, ((hr - 100) / 80) * 100));
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[6px] flex flex-col items-center group relative cursor-pointer"
                  >
                    <div
                      className="w-full bg-gradient-to-t from-red-600/70 to-primary rounded-t transition-all group-hover:brightness-125"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <div className="hidden group-hover:block absolute bottom-full mb-1 z-20 bg-surface-subtle border border-border px-2 py-0.5 rounded text-[10px] font-mono text-text-main whitespace-nowrap shadow-md">
                      {hr} bpm · {b.step_count} spm
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[11px] font-mono text-text-muted">
              <span>Warm-up (~120 bpm)</span>
              <span>Cadence (~155 bpm)</span>
              <span>Cool-down (~125 bpm)</span>
            </div>
          </div>
        )}

        {/* Historical Sessions & Field Log Transcripts */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-sm font-display font-semibold text-text-main">
            Recent Sessions & Field Notes
          </div>

          <div className="divide-y divide-border/50">
            {recent_runs.map((r, idx) => (
              <div key={idx} className="py-3.5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-semibold text-text-main">
                      Run #{r.run_id} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Duration: {Math.round(r.elapsed_s / 60)}m · Pocket: {Math.round(r.pocket_s / 60)}m · Screen: {Math.round(r.screen_s / 60)}m
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Δ +{r.mood_delta} pts
                    </span>
                    <div className="text-[10px] text-text-muted mt-0.5 font-mono">
                      Daylight: {r.daylight_at_start}m
                    </div>
                  </div>
                </div>

                {r.field_logs && r.field_logs.length > 0 && (
                  <div className="space-y-1.5 pl-3 border-l-2 border-primary/40">
                    {r.field_logs.map((log, lIdx) => (
                      <div key={lIdx} className="text-xs bg-surface-subtle/50 p-2 rounded-xl border border-border/30">
                        <div className="text-text-main italic text-xs">
                          "{log.transcript || log.raw_text}"
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                          <span className="text-primary font-semibold">Summary:</span>
                          <span>{log.summary}</span>
                          {log.tags && log.tags.map((t, ti) => (
                            <span key={ti} className="px-1 py-0.2 rounded bg-surface border border-border text-text-muted">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
