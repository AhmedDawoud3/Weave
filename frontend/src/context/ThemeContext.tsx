/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'cyberpunk' | 'weave-dark' | 'midnight-slate' | 'dracula';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Default to cyberpunk for visitors and onboarding
    return (localStorage.getItem('weave_theme') as Theme) || 'cyberpunk';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('weave_theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    // Clear existing theme state
    root.removeAttribute('data-theme');
    root.classList.remove('cyberpunk', 'weave-dark', 'midnight-slate', 'dracula');
    
    // Apply selected theme
    root.setAttribute('data-theme', theme);
    root.classList.add(theme);
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
