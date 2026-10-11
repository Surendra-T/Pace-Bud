import React, { createContext, useContext, useEffect, useState } from 'react';

const THEMES = [
  { id: 'theme-oxford-navy', name: 'Oxford Navy', dark: true, preview: '#0f172a' },
  { id: 'theme-racing-green', name: 'Racing Green', dark: true, preview: '#0a1a13' },
  { id: 'theme-camel-cashmere', name: 'Camel & Cashmere', dark: true, preview: '#1c1612' },
  { id: 'theme-st-moritz', name: 'St. Moritz Ice', dark: false, preview: '#f1f5f9' },
  { id: 'theme-vintage-parchment', name: 'Vintage Parchment', dark: false, preview: '#f7f4ee' },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pacebud_theme') || 'theme-oxford-navy';
  });

  useEffect(() => {
    const root = document.documentElement;
    THEMES.forEach((t) => root.classList.remove(t.id));
    root.classList.add(theme);
    localStorage.setItem('pacebud_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
