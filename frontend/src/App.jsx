import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import DeskBreaker from './components/DeskBreaker';
import OutdoorMode from './components/OutdoorMode';
import StatsForNerds from './components/StatsForNerds';
import SpotifyCallback from './components/SpotifyCallback';
import CommandCenterModal from './components/CommandCenterModal';
import { Footprints, BarChart2, Command } from 'lucide-react';

function NavigationBar({ onOpenCommandCenter }) {
  const location = useLocation();

  return (
    <header className="border-b border-border/60 bg-surface/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-surface-subtle border border-border group-hover:border-primary/50 transition-colors">
            <Footprints className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-display font-semibold text-lg tracking-tight text-text-main">
              Pace-Bud
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Stats link */}
          <Link
            to="/stats"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              location.pathname === '/stats'
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-border bg-surface hover:bg-surface-subtle text-text-muted hover:text-text-main'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Stats</span>
          </Link>

          {/* Minimal Command Center Button */}
          <button
            onClick={onOpenCommandCenter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text-main text-xs font-medium transition-all shadow-sm active:scale-95"
            title="Open Command Center (Settings & Themes)"
          >
            <Command className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function MainLayout() {
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-main transition-colors duration-300">
      <NavigationBar onOpenCommandCenter={() => setCommandCenterOpen(true)} />
      <main className="flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<DeskBreaker />} />
          <Route path="/outdoor" element={<OutdoorMode />} />
          <Route path="/stats" element={<StatsForNerds />} />
          <Route path="/callback" element={<SpotifyCallback />} />
        </Routes>
      </main>
      <footer className="border-t border-border/40 py-5 text-center text-xs text-text-muted font-mono tracking-wider">
        PACE-BUD · JOHN WICK & CONCIERGE · MINDFUL OUTDOOR STRIDE
      </footer>

      <CommandCenterModal
        isOpen={commandCenterOpen}
        onClose={() => setCommandCenterOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </ThemeProvider>
  );
}
