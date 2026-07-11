/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'weave-dark' | 'weave-light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('weave-theme');
    return (saved as Theme) || 'weave-dark';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('weave-theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.removeAttribute('data-theme');
    root.classList.remove('cyberpunk', 'weave-dark', 'weave-light', 'midnight-slate', 'dracula', 'dark', 'light');
    
    root.setAttribute('data-theme', theme);
    root.classList.add(theme);
    if (theme === 'weave-dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
