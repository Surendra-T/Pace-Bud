import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, Check } from 'lucide-react';

export default function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-text-main hover:bg-surface-subtle transition-colors text-sm shadow-sm"
        title="Switch bespoke theme"
      >
        <Palette className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline font-medium">Theme</span>
      </button>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-surface border border-border ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-border/40"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="py-1">
            <div className="px-3 py-1.5 text-xs text-text-muted uppercase tracking-wider font-semibold">
              Bespoke Palettes
            </div>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                  theme === t.id
                    ? 'bg-surface-subtle text-primary font-semibold'
                    : 'text-text-main hover:bg-surface-subtle/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-border"
                    style={{ backgroundColor: t.preview }}
                  />
                  <span>{t.name}</span>
                </div>
                {theme === t.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
