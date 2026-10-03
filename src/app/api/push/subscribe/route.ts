import { NextRequest, NextResponse } from 'next/server';

// Store subscriptions in memory (and persist if table exists)
let subscriptions: any[] = [];

export function getSubscriptions() {
  return subscriptions;
}

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const existingIndex = subscriptions.findIndex(s => s.endpoint === subscription.endpoint);
    if (existingIndex >= 0) {
      subscriptions[existingIndex] = subscription;
    } else {
      subscriptions.push(subscription);
    }

    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save subscription' }, { status: 500 });
  }
}
