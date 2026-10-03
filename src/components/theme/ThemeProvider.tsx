'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'toi-portal-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      const initialPreference: ThemePreference = stored === 'dark' || stored === 'light' || stored === 'system' 
        ? stored 
        : 'light';
      setThemePreferenceState(initialPreference);

      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const effectiveTheme: Theme = initialPreference === 'system' 
        ? (systemDark ? 'dark' : 'light')
        : initialPreference;

      setResolvedTheme(effectiveTheme);
      applyThemeToDOM(effectiveTheme);
    } catch {
      // Ignore localstorage errors
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themePreference === 'system') {
        const newTheme: Theme = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);
        applyThemeToDOM(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, themePreference]);

  function applyThemeToDOM(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }

  function setTheme(newPreference: ThemePreference) {
    setThemePreferenceState(newPreference);
    try {
      localStorage.setItem(STORAGE_KEY, newPreference);
    } catch {}

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectiveTheme: Theme = newPreference === 'system'
      ? (systemDark ? 'dark' : 'light')
      : newPreference;

    setResolvedTheme(effectiveTheme);
    applyThemeToDOM(effectiveTheme);
  }

  function toggleTheme() {
    const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themePreference,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
