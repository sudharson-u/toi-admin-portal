import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getMockCustomers } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    const list = getMockCustomers();
    const expiring = list.filter(c => 
      c.subscriptions[0]?.status === 'renew_soon' || 
      c.subscriptions[0]?.status === 'expiring_this_month'
    );
    const mockNotifs = expiring.slice(0, 20).map((c, i) => ({
      id: `notif-${i + 1}`,
      notification_type: 'renewal_reminder',
      scheduled_date: c.subscriptions[0].notification_date,
      status: 'pending',
      read_at: null,
      created_at: new Date().toISOString(),
      customers: {
        id: c.id,
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        mobile_number: c.mobile_number,
      },
      subscriptions: {
        start_date: c.subscriptions[0].start_date,
        end_date: c.subscriptions[0].end_date,
      }
    }));
    return NextResponse.json({ notifications: mockNotifs, total: mockNotifs.length });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: notifications, count, error } = await supabase
    .from('notifications')
    .select(`
      *,
      customers(id, customer_id, customer_name, mobile_number),
      subscriptions(start_date, end_date)
    `, { count: 'exact' })
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications, total: count });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, action } = body;

  if (action === 'mark_read') {
    await supabase.from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
  } else if (action === 'dismiss') {
    await supabase.from('notifications')
      .update({ status: 'dismissed', read_at: new Date().toISOString() })
      .eq('id', id);
  } else if (action === 'mark_all_read') {
    await supabase.from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
  }

  return NextResponse.json({ success: true });
}
