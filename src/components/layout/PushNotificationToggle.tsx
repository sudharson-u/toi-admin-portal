'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
      setSupported(true);
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setSubscribed(true);
          });
        });
      }
    }
  }, []);

  async function handleToggle() {
    if (!supported) {
      alert('Web Push is not supported in this browser.');
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatusMessage('Notification permission denied');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (!vapidKey) {
          throw new Error('VAPID public key not found');
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      // Send subscription to backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });

      setSubscribed(true);
      setStatusMessage('Push notifications enabled!');

      // Send immediate welcome/test notification
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🔔 Times of India • Renewal Alert System',
          message: 'Web push notifications are now active! You will receive automatic 3-month renewal alerts.',
          url: '/renewals',
        }),
      });

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error enabling push:', err);
      setStatusMessage(err.message || 'Failed to enable notifications');
    }

    setLoading(false);
  }

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={loading}
        title={subscribed ? 'Web & PWA Push Notifications Active' : 'Enable Web & PWA Push Notifications'}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
          subscribed
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
        )}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : subscribed ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Push Active</span>
          </>
        ) : (
          <>
            <BellRing className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span className="hidden md:inline">Enable Web Alerts</span>
          </>
        )}
      </button>

      {statusMessage && (
        <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 animate-in fade-in">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
