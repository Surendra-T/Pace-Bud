import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Command, Check, X, Shield, Sliders } from 'lucide-react';

export default function CommandCenterModal({ isOpen, onClose }) {
  const { theme, setTheme, themes } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300">
      <div 
        className="bg-surface border border-border/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden transition-all transform duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface-subtle border border-border text-primary">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-text-main">
                Command Center
              </h2>
              <p className="text-xs text-text-muted">
                System preferences & bespoke styling
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-border bg-surface-subtle text-text-muted hover:text-text-main hover:bg-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-6">
          {/* Identity */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Active Identity
            </label>
            <div className="p-3 rounded-2xl bg-surface-subtle border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-display font-bold flex items-center justify-center text-sm border border-primary/30">
                  JW
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-main">John Wick</div>
                  <div className="text-xs text-text-muted">Concierge Dispatch Ready</div>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>
          </div>

          {/* Theme selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Theme Palette
            </label>
            <div className="grid grid-cols-1 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between transition-all ${
                    theme === t.id
                      ? 'bg-surface-subtle text-primary border border-primary/50 shadow-sm'
                      : 'border border-border/40 hover:bg-surface-subtle/50 text-text-main'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full border border-border/70 shadow-inner"
                      style={{ backgroundColor: t.preview }}
                    />
                    <span className="font-medium">{t.name}</span>
                  </div>
                  {theme === t.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Minimal Mode notice */}
          <div className="p-3 rounded-2xl bg-surface-subtle/40 border border-border/50 text-xs text-text-muted leading-relaxed">
            Pace-Bud runs in distraction-free minimal mode. Screen distractions stay archived here.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-slate-950 font-semibold text-sm hover:bg-primary-hover shadow-sm transition-transform active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
