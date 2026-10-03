import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getMockCustomers, getMockCustomerById } from '@/lib/mockData';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configured = isSupabaseConfigured();

  if (!configured) {
    const customer = getMockCustomerById(id);
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json({ customer });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      *,
      subscriptions(id, start_date, end_date, status, is_current, notification_date, created_at)
    `)
    .eq('id', id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Sort subscriptions: current first, then by created_at desc
  customer.subscriptions = customer.subscriptions?.sort((a: { is_current: boolean; created_at: string }, b: { is_current: boolean; created_at: string }) => {
    if (a.is_current) return -1;
    if (b.is_current) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) || [];

  return NextResponse.json({ customer });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configured = isSupabaseConfigured();
  const body = await request.json();
  const { customer_id, customer_name, address, mobile_number, order_id, start_date, end_date } = body;

  if (!configured) {
    const cust = getMockCustomerById(id);
    if (!cust) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    if (customer_id) cust.customer_id = customer_id;
    if (customer_name) cust.customer_name = customer_name;
    if (address !== undefined) cust.address = address;
    if (mobile_number !== undefined) cust.mobile_number = mobile_number;
    if (order_id !== undefined) cust.order_id = order_id;
    if (start_date && cust.subscriptions[0]) cust.subscriptions[0].start_date = start_date;
    if (end_date && cust.subscriptions[0]) cust.subscriptions[0].end_date = end_date;
    return NextResponse.json({ success: true, customer: cust });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get existing customer for audit
  const { data: existing } = await supabase.from('customers').select('*').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  // Update customer
  const { error: customerError } = await supabase
    .from('customers')
    .update({ customer_id, customer_name, address, mobile_number, order_id })
    .eq('id', id);

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  // Update current subscription if dates changed
  if (start_date || end_date) {
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('customer_id', id)
      .eq('is_current', true)
      .single();

    if (currentSub) {
      await supabase.from('subscriptions')
        .update({
          start_date: start_date || currentSub.start_date,
          end_date: end_date || currentSub.end_date,
        })
        .eq('id', currentSub.id);
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    customer_id: id,
    action: 'customer_updated',
    old_value: { customer_id: existing.customer_id, customer_name: existing.customer_name, address: existing.address, mobile_number: existing.mobile_number, order_id: existing.order_id },
    new_value: { customer_id, customer_name, address, mobile_number, order_id, start_date, end_date },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
