import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getMockCustomers } from '@/lib/mockData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const configured = isSupabaseConfigured();

  if (!configured) {
    const cust = getMockCustomers().find(c => c.id === id || c.customer_id === id);
    return NextResponse.json({ notes: cust?.notes || '' });
  }

  const supabase = await createClient();

  // Fetch the most recent note from audit_logs
  const { data: noteLog } = await supabase
    .from('audit_logs')
    .select('new_value, created_at')
    .eq('customer_id', id)
    .eq('action', 'customer_note')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (noteLog?.new_value?.note !== undefined) {
    return NextResponse.json({
      notes: noteLog.new_value.note || '',
      updated_at: noteLog.created_at,
    });
  }

  // Fallback to customer record if column exists
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  return NextResponse.json({
    notes: (customer as any)?.notes || '',
    updated_at: customer?.updated_at,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const notes = typeof body.notes === 'string' ? body.notes : '';
  const configured = isSupabaseConfigured();

  if (!configured) {
    const cust = getMockCustomers().find(c => c.id === id || c.customer_id === id);
    if (cust) cust.notes = notes;
    return NextResponse.json({ success: true, notes });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Try updating customers table directly (if notes column is present)
  await supabase
    .from('customers')
    .update({ notes } as any)
    .eq('id', id);

  // 2. Insert into audit_logs for permanent versioned note history
  const { error: logErr } = await supabase
    .from('audit_logs')
    .insert({
      user_id: user?.id || null,
      customer_id: id,
      action: 'customer_note',
      new_value: { note: notes },
    });

  if (logErr) {
    console.warn('Note audit log save error:', logErr);
  }

  return NextResponse.json({
    success: true,
    notes,
    updated_at: new Date().toISOString(),
  });
}
