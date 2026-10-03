'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
}

export default function ThemeToggle({ collapsed = false, className }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Prevent SSR hydration flicker by rendering placeholder matching space
    return (
      <div className={cn("p-3", className)}>
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  // Collapsed desktop view - icon button only
  if (collapsed) {
    return (
      <div className={cn("px-2 py-3 flex justify-center", className)}>
        <button
          type="button"
          onClick={toggleTheme}
          id="theme-toggle-collapsed-btn"
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all shadow-2xs"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-gray-700 hover:-rotate-12 transition-transform" />
          )}
        </button>
      </div>
    );
  }

  // Expanded sidebar & mobile drawer view - placed in green circled area
  return (
    <div className={cn("p-3", className)}>
      <div className="bg-gray-50 dark:bg-gray-900/90 rounded-2xl p-2 border border-gray-100 dark:border-gray-800 shadow-2xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Appearance
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100/60 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </div>

        {/* Segmented Light/Dark switcher */}
        <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-gray-800 p-1 rounded-xl">
          <button
            type="button"
            id="theme-btn-light"
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200",
              theme === 'light'
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <Sun className={cn("w-3.5 h-3.5 transition-transform", theme === 'light' ? "text-amber-500 scale-110" : "text-gray-400")} />
            <span>Light</span>
          </button>

          <button
            type="button"
            id="theme-btn-dark"
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200",
              theme === 'dark'
                ? "bg-slate-900 text-white shadow-sm border border-gray-700"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <Moon className={cn("w-3.5 h-3.5 transition-transform", theme === 'dark' ? "text-blue-400 scale-110" : "text-gray-400")} />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </div>
  );
}
