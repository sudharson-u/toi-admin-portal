'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Eye, X, ArrowRight, RefreshCw } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  notification_type: string;
  scheduled_date: string;
  status: string;
  read_at: string | null;
  created_at: string;
  customers: {
    id: string;
    customer_id: string;
    customer_name: string;
    mobile_number: string;
  };
  subscriptions: {
    start_date: string;
    end_date: string;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${page}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch {
      console.error('Failed to fetch notifications');
    }
    setLoading(false);
  }

  async function handleAction(id: string, action: 'mark_read' | 'dismiss' | 'mark_all_read') {
    setActionLoading(id);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    setActionLoading(null);
    fetchNotifications();
  }

  async function markAllRead() {
    setActionLoading('all');
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all', action: 'mark_all_read' }),
    });
    setActionLoading(null);
    fetchNotifications();
  }

  const unreadCount = notifications.filter(n => !n.read_at).length;
  const today = new Date().toISOString().split('T')[0];

  const statusConfig = {
    pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    notified: { label: 'Notified', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    dismissed: { label: 'Dismissed', color: 'text-gray-500 bg-gray-50 border-gray-200' },
    renewed: { label: 'Renewed', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  };

  return (
    <div className="page-container max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full px-1">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{total} total notifications</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={actionLoading === 'all'}
            className="btn-secondary text-sm"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="card p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-16">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-600">No notifications</p>
          <p className="text-sm text-gray-400 mt-1">Renewal reminders will appear here when subscriptions are approaching expiry</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {notifications.map((notif, idx) => {
            const isUnread = !notif.read_at;
            const isDue = notif.scheduled_date <= today;
            const customer = notif.customers;
            const sub = notif.subscriptions;
            const config = statusConfig[notif.status as keyof typeof statusConfig] || statusConfig.pending;

            return (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-4 p-4 transition-colors border-b border-gray-50 last:border-0',
                  isUnread ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50/60'
                )}
              >
                {/* Indicator */}
                <div className="flex-shrink-0 mt-1">
                  {isUnread ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={cn('text-sm font-semibold', isUnread ? 'text-gray-900' : 'text-gray-700')}>
                      {customer?.customer_name || 'Unknown Customer'}
                    </p>
                    <span className={cn('status-badge text-[10px]', config.color)}>
                      {config.label}
                    </span>
                    {isDue && notif.status === 'pending' && (
                      <span className="status-badge text-[10px] text-red-600 bg-red-50 border-red-200 animate-pulse">
                        🔔 Due Now
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-1">
                    Subscription expires: <span className="font-medium text-gray-700">{formatDate(sub?.end_date)}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Reminder date: {formatDate(notif.scheduled_date)}
                    {notif.read_at && ` · Read ${formatDate(notif.read_at)}`}
                  </p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Link
                      href={`/customers/${customer?.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      View Customer <ArrowRight className="w-3 h-3" />
                    </Link>
                    {isUnread && (
                      <button
                        onClick={() => handleAction(notif.id, 'mark_read')}
                        disabled={actionLoading === notif.id}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Eye className="w-3 h-3" /> Mark read
                      </button>
                    )}
                    {notif.status !== 'dismissed' && notif.status !== 'renewed' && (
                      <button
                        onClick={() => handleAction(notif.id, 'dismiss')}
                        disabled={actionLoading === notif.id}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" /> Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= total}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex items-start gap-2">
          <Bell className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-800">How renewal reminders work</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Notifications are automatically created 3 calendar months before each subscription end date.
              For example, an end date of 31 Dec generates a reminder on 30 Sep.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
