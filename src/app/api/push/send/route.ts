import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import webpush from 'web-push';
import { getSubscriptions } from '../subscribe/route';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const email = process.env.VAPID_EMAIL || 'mailto:ukss61925@gmail.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(email, publicKey, privateKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title || '🔔 TOI Renewal Alert';
    const message = body.message || 'Upcoming customer subscriptions require 3-month renewal notice.';
    const url = body.url || '/renewals';

    const payload = JSON.stringify({
      title,
      body: message,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });

    const currentSubs = getSubscriptions();
    if (currentSubs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active web push subscribers registered yet. Please enable push notifications on your browser/PWA first.',
      });
    }

    const sendPromises = currentSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        console.warn('Failed to send push to subscriber:', err.statusCode);
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, sentTo: currentSubs.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to dispatch push notification' }, { status: 500 });
  }
}
