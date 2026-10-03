'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function ThemeSettingsSelector() {
  const { theme, themePreference, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const options = [
    {
      id: 'light' as const,
      label: 'Light Mode',
      desc: 'Clean & high contrast with crisp white surfaces',
      icon: Sun,
      iconColor: 'text-amber-500',
      activeBorder: 'border-blue-600 ring-2 ring-blue-500/20',
      previewBg: 'bg-white border-gray-200 text-gray-900',
    },
    {
      id: 'dark' as const,
      label: 'Dark Mode',
      desc: 'Deep slate theme, easy on the eyes in low light',
      icon: Moon,
      iconColor: 'text-blue-400',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      previewBg: 'bg-gray-900 border-gray-700 text-white',
    },
    {
      id: 'system' as const,
      label: 'System Preference',
      desc: 'Automatically matches your device OS appearance',
      icon: Laptop,
      iconColor: 'text-purple-400',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      previewBg: 'bg-gradient-to-r from-white to-gray-900 border-gray-400 text-gray-800',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((opt) => {
          const isSelected = themePreference === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={cn(
                'relative flex flex-col items-start p-4 rounded-xl border text-left transition-all',
                isSelected
                  ? cn('bg-blue-50/50 dark:bg-blue-950/20', opt.activeBorder)
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 mb-3">
                <Icon className={cn('w-5 h-5', opt.iconColor)} />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {opt.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
        <span>Currently Active:</span>
        <span className="font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {theme} mode {themePreference === 'system' ? '(auto)' : ''}
        </span>
      </div>
    </div>
  );
}
