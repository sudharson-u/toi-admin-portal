import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { new_start_date, new_end_date } = body;

  if (!new_start_date || !new_end_date) {
    return NextResponse.json({ error: 'new_start_date and new_end_date are required' }, { status: 400 });
  }

  // Get current subscription
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('customer_id', id)
    .eq('is_current', true)
    .single();

  if (!currentSub) {
    return NextResponse.json({ error: 'No current subscription found' }, { status: 404 });
  }

  // Mark old subscription as renewed (not current)
  await supabase
    .from('subscriptions')
    .update({ is_current: false, status: 'renewed' })
    .eq('id', currentSub.id);

  // Mark old notifications as renewed
  await supabase
    .from('notifications')
    .update({ status: 'renewed' })
    .eq('subscription_id', currentSub.id)
    .in('status', ['pending', 'notified']);

  // Create new subscription
  const { data: newSub, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      customer_id: id,
      start_date: new_start_date,
      end_date: new_end_date,
      status: 'active',
      is_current: true,
    })
    .select()
    .single();

  if (subError || !newSub) {
    return NextResponse.json({ error: subError?.message || 'Failed to create subscription' }, { status: 500 });
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    customer_id: id,
    action: 'subscription_renewed',
    old_value: { start_date: currentSub.start_date, end_date: currentSub.end_date },
    new_value: { start_date: new_start_date, end_date: new_end_date },
  });

  return NextResponse.json({ subscription: newSub });
}
