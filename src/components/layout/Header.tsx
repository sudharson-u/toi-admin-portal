'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, LogOut, User, ChevronDown, X } from 'lucide-react';
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
    // Keyboard shortcut: Ctrl+K for search
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 100);
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
    } catch {}
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
    return `${prefix}, Umpathy`;
  };

  return (
    <>
      {/* Global search overlay */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => setShowSearch(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, ID, phone, order ID or address..."
                className="w-full pl-10 pr-10 py-3.5 text-sm border-0 rounded-xl focus:outline-none focus:ring-0 bg-gray-50"
                autoFocus
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            <p className="text-xs text-gray-400 mt-3 px-1">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Enter</kbd> to search
              &nbsp;·&nbsp;
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}

      <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-3 flex-shrink-0">
        {/* Greeting (desktop) */}
        <div className="hidden lg:block mr-auto">
          <p className="text-sm font-medium text-gray-700">{greeting()}</p>
        </div>

        <div className="flex-1 lg:flex-none" />

        {/* Search button */}
        <button
          id="global-search-btn"
          onClick={() => {
            setShowSearch(true);
            setTimeout(() => searchRef.current?.focus(), 100);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <span className="hidden sm:inline text-xs text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">⌘K</span>
        </button>

        {/* Install PWA Button */}
        <InstallPwaButton className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold rounded-lg shadow-2xs transition-all" />

        {/* Push Notification Toggle */}
        <PushNotificationToggle />

        {/* Notifications */}
        <Link
          href="/notifications"
          id="notification-bell"
          className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
              U
            </div>
            <span className="hidden sm:inline text-sm font-semibold text-gray-800 max-w-[120px] truncate">
              Umpathy
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', showUserMenu && 'rotate-180')} />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 overflow-hidden fade-in">
                <div className="px-3 py-2 border-b border-gray-50">
                  <p className="text-xs font-bold text-gray-900">Umpathy</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-medium rounded">
                    Circulation Head • Admin
                  </span>
                </div>
                <button
                  id="sign-out-btn"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>
    </>
  );
}
