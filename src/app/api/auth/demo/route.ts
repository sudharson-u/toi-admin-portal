import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json().catch(() => ({ action: 'login' }));
    const response = NextResponse.json({ success: true });

    if (action === 'logout') {
      response.cookies.delete('demo_session');
    } else {
      response.cookies.set('demo_session', 'true', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process demo auth' }, { status: 500 });
  }
}
