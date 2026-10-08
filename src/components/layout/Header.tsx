'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, LogOut, ChevronDown, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import PushNotificationToggle from './PushNotificationToggle';
import InstallPwaButton from './InstallPwaButton';

interface HeaderProps {
  user: SupabaseUser;
}

export default function Header({ user }: HeaderProps) {
  const [notifCount, setNotifCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotifCount();
    // Keyboard shortcut: Ctrl+K or Cmd+K for search
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 80);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function fetchNotifCount() {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('read_at', null);
      setNotifCount(count || 0);
    } catch {
      setNotifCount(0);
    }
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      await supabase.auth.signOut();
    } catch { }
    router.push('/login');
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  }

  const greeting = () => {
    const hour = new Date().getHours();
    const prefix = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    return `${prefix}, Umapathy`;
  };

  return (
    <>
      {/* Global search overlay modal */}
      {showSearch && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-20 px-4 backdrop-blur-xs"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="bg-white dark:bg-[#151C2C] rounded-2xl shadow-2xl w-full max-w-xl p-4 border border-gray-200 dark:border-[#222E45]"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, ID, phone, order ID or address..."
                className="w-full pl-11 pr-10 py-3 text-sm rounded-xl focus:outline-none bg-gray-50 dark:bg-[#1F293D] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-[#222E45]"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 px-1">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400 font-mono">Enter</kbd> to search
              &nbsp;·&nbsp;
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400 font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header className="h-14 frosted-header flex items-center px-4 lg:px-6 gap-3 flex-shrink-0 transition-colors z-30">
        {/* Greeting (desktop) */}
        <div className="hidden lg:block mr-auto">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{greeting()}</p>
        </div>

        {/* Prominent Engineered Search Bar */}
        <div className="flex-1 max-w-md lg:mx-auto">
          <button
            id="global-search-btn"
            type="button"
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchRef.current?.focus(), 80);
            }}
            className="w-full flex items-center justify-between pl-3.5 pr-2.5 py-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-50/90 dark:bg-[#1F293D]/80 hover:bg-gray-100 dark:hover:bg-[#1F293D] rounded-lg border border-gray-200 dark:border-[#222E45] shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 flex-shrink-0" />
              <span className="truncate text-gray-400 group-hover:text-gray-600 dark:text-gray-400">Search customers, phones, orders...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-[#151C2C] border border-gray-200 dark:border-[#222E45] px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Install PWA Button */}
          <InstallPwaButton className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition-all" />

          {/* Push Notification Toggle */}
          <PushNotificationToggle />

          {/* Notifications */}
          <Link
            href="/notifications"
            id="notification-bell"
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:text-white dark:hover:bg-[#1F293D] rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#222E45]"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5 text-current" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-xs">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-[#1F293D] border border-transparent hover:border-gray-200 dark:hover:border-[#222E45] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-xs">
                U
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-gray-800 dark:text-gray-200 max-w-[120px] truncate">
                Umapathy
              </span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-[#151C2C] border border-gray-200 dark:border-[#222E45] rounded-xl shadow-xl z-20 py-1 overflow-hidden fade-in">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-[#222E45]">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Umapathy</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[10px] font-medium rounded">
                      Circulation Head • Admin
                    </span>
                  </div>
                  <button
                    id="sign-out-btn"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
