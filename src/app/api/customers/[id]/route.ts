import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getMockCustomers, getMockCustomerById, deleteMockCustomer } from '@/lib/mockData';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configured = isSupabaseConfigured();

  // Instant response for mock/Excel customers
  if (!configured || id.startsWith('cust-')) {
    const customer = getMockCustomerById(id);
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json({ customer });
  }

  try {
    const supabase = await createClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        subscriptions(id, start_date, end_date, status, is_current, notification_date, created_at)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !customer) {
      // Check mock fallback
      const mock = getMockCustomerById(id);
      if (mock) return NextResponse.json({ customer: mock });
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Sort subscriptions: current first, then by created_at desc
    customer.subscriptions = customer.subscriptions?.sort((a: { is_current: boolean; created_at: string }, b: { is_current: boolean; created_at: string }) => {
      if (a.is_current) return -1;
      if (b.is_current) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }) || [];

    return NextResponse.json({ customer });
  } catch {
    const mock = getMockCustomerById(id);
    if (mock) return NextResponse.json({ customer: mock });
    return NextResponse.json({ error: 'Failed to load customer' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configured = isSupabaseConfigured();
  const body = await request.json();
  const { customer_id, customer_name, address, mobile_number, order_id, start_date, end_date } = body;

  // Instant response for mock/Excel customers
  if (!configured || id.startsWith('cust-')) {
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

  try {
    const supabase = await createClient();

    const customerRes = await supabase
      .from('customers')
      .update({ customer_id, customer_name, address, mobile_number, order_id })
      .eq('id', id);

    if (customerRes.error) {
      return NextResponse.json({ error: customerRes.error.message }, { status: 500 });
    }

    if (start_date || end_date) {
      await supabase
        .from('subscriptions')
        .update({
          ...(start_date ? { start_date } : {}),
          ...(end_date ? { end_date } : {}),
        })
        .eq('customer_id', id)
        .eq('is_current', true);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configured = isSupabaseConfigured();

  if (!configured || id.startsWith('cust-')) {
    const deleted = deleteMockCustomer(id);
    if (!deleted) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = await createClient();

    // Delete subscriptions and audit logs first to prevent foreign key constraint issues
    await Promise.all([
      supabase.from('subscriptions').delete().eq('customer_id', id),
      supabase.from('audit_logs').delete().eq('customer_id', id),
    ]);

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete' }, { status: 500 });
  }
}
