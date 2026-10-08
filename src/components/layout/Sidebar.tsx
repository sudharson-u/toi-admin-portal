'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Users, RefreshCw, Bell, FileText,
  Upload, Settings, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/theme/ThemeToggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/renewals', label: 'Renewals', icon: RefreshCw },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/import', label: 'Import / Export', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        id="mobile-menu-toggle"
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-3.5 z-50 lg:hidden bg-white dark:bg-[#151C2C] border border-gray-200 dark:border-[#222E45] text-gray-700 dark:text-gray-200 rounded-lg p-2 shadow-sm"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-[#151C2C] border-r border-gray-200 dark:border-[#222E45] transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-[#222E45]',
          collapsed && 'justify-center px-2'
        )}>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-xs border border-red-100 dark:border-red-950 bg-red-600">
            <img src="/logo.png" alt="TOI Logo" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-black tracking-wider text-gray-900 dark:text-gray-100 leading-tight">THE TIMES OF INDIA</p>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold leading-tight truncate">Admin: Umapathy</p>
            </div>
          )}
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className={cn('lg:hidden ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1', collapsed && 'hidden')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'sidebar-link',
                  isActive && 'active',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0 text-current" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Theme Switcher placed in the sidebar */}
        <div className="border-t border-gray-200 dark:border-[#222E45]">
          <ThemeToggle collapsed={collapsed} />
        </div>

        {/* Collapse button (desktop only) */}
        <div className="hidden lg:flex px-2 py-3 border-t border-gray-200 dark:border-[#222E45]">
          <button
            id="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            className={cn('btn-ghost w-full justify-center', !collapsed && 'justify-start')}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
