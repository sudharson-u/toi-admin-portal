import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { calculateStatus, calculateNotificationDate } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, addMonths, parseISO, isBefore, isAfter } from 'date-fns';
import { getMockCustomers, addMockCustomer } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const statusFilter = searchParams.get('status') || '';
    const expiryFilter = searchParams.get('expiry') || '';
    const sortBy = searchParams.get('sort') || 'customer_name';
    const sortDir = (searchParams.get('dir') || 'asc') === 'desc' ? 'desc' : 'asc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    let list = getMockCustomers();

    if (search) {
      list = list.filter(c =>
        c.customer_name.toLowerCase().includes(search) ||
        c.customer_id.toLowerCase().includes(search) ||
        c.mobile_number.toLowerCase().includes(search) ||
        c.address.toLowerCase().includes(search) ||
        c.order_id.toLowerCase().includes(search)
      );
    }

    if (statusFilter) {
      list = list.filter(c => c.subscriptions[0]?.status === statusFilter);
    }

    if (expiryFilter) {
      const today = new Date();
      if (expiryFilter === 'this_month') {
        const mStart = startOfMonth(today);
        const mEnd = endOfMonth(today);
        list = list.filter(c => {
          const d = parseISO(c.subscriptions[0].end_date);
          return d >= mStart && d <= mEnd;
        });
      } else if (expiryFilter === '3_months') {
        const in3M = endOfMonth(addMonths(today, 3));
        list = list.filter(c => {
          const d = parseISO(c.subscriptions[0].end_date);
          return d >= today && d <= in3M;
        });
      }
    }

    // Sort
    list.sort((a, b) => {
      let valA: string = '';
      let valB: string = '';
      if (sortBy === 'customer_id') { valA = a.customer_id; valB = b.customer_id; }
      else if (sortBy === 'end_date') { valA = a.subscriptions[0]?.end_date || ''; valB = b.subscriptions[0]?.end_date || ''; }
      else if (sortBy === 'mobile_number') { valA = a.mobile_number; valB = b.mobile_number; }
      else { valA = a.customer_name; valB = b.customer_name; }

      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const total = list.length;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      customers: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const expiryFilter = searchParams.get('expiry') || '';
  const sortBy = searchParams.get('sort') || 'customer_name';
  const sortDir = (searchParams.get('dir') || 'asc') === 'desc' ? false : true;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const offset = (page - 1) * limit;

  const today = new Date();

  // Determine sort column
  const sortableColumns: Record<string, string> = {
    customer_name: 'customer_name',
    customer_id: 'customer_id',
    mobile_number: 'mobile_number',
    order_id: 'order_id',
    end_date: 'end_date', // handled via subscription join
    start_date: 'start_date',
  };
  const validSortCol = sortableColumns[sortBy] || 'customer_name';

  // Build query
  let query = supabase
    .from('customers')
    .select(`
      id, customer_id, customer_name, address, mobile_number, order_id,
      subscriptions!inner(id, start_date, end_date, status, is_current, notification_date)
    `, { count: 'exact' })
    .eq('subscriptions.is_current', true);

  // Search across all fields
  if (search) {
    const s = search.trim();
    query = query.or(
      `customer_id.ilike.%${s}%,customer_name.ilike.%${s}%,address.ilike.%${s}%,mobile_number.ilike.%${s}%,order_id.ilike.%${s}%`
    );
  }

  // Expiry filter
  if (expiryFilter) {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const nextMonthStart = startOfMonth(addMonths(today, 1));
    const nextMonthEnd = endOfMonth(addMonths(today, 1));
    const in3Months = endOfMonth(addMonths(today, 3));

    if (expiryFilter === 'this_month') {
      query = query
        .gte('subscriptions.end_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('subscriptions.end_date', format(monthEnd, 'yyyy-MM-dd'));
    } else if (expiryFilter === 'next_month') {
      query = query
        .gte('subscriptions.end_date', format(nextMonthStart, 'yyyy-MM-dd'))
        .lte('subscriptions.end_date', format(nextMonthEnd, 'yyyy-MM-dd'));
    } else if (expiryFilter === 'next_3_months') {
      query = query
        .gte('subscriptions.end_date', format(today, 'yyyy-MM-dd'))
        .lte('subscriptions.end_date', format(in3Months, 'yyyy-MM-dd'));
    } else if (expiryFilter === 'expired') {
      query = query.lt('subscriptions.end_date', format(today, 'yyyy-MM-dd'));
    }
  }

  // Sort
  if (validSortCol === 'end_date' || validSortCol === 'start_date') {
    query = query.order(validSortCol, { ascending: sortDir, referencedTable: 'subscriptions' });
  } else {
    query = query.order(validSortCol, { ascending: sortDir });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: customers, count, error } = await query;

  if (error) {
    console.error('Customers API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clean fake customer IDs so only real Excel customer IDs appear
  let filtered = (customers || []).map(c => ({
    ...c,
    customer_id: c.customer_id && !c.customer_id.startsWith('TOI-') ? c.customer_id : '',
  }));

  if (statusFilter) {
    filtered = filtered.filter((c) => {
      const sub = c.subscriptions?.[0];
      if (!sub) return statusFilter === 'expired';
      return calculateStatus(sub.end_date, today) === statusFilter;
    });
  }

  return NextResponse.json({
    customers: filtered,
    total: statusFilter ? filtered.length : (count || 0),
    page,
    limit,
  });
}

export async function POST(request: NextRequest) {
  const configured = isSupabaseConfigured();
  const body = await request.json();
  const { customer_id, customer_name, address, mobile_number, order_id, start_date, end_date } = body;

  if (!customer_id || !customer_name || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!configured) {
    const customer = addMockCustomer({
      customer_id,
      customer_name,
      address,
      mobile_number,
      order_id,
      start_date,
      end_date,
    });
    return NextResponse.json({ customer }, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check duplicate customer_id
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('customer_id', customer_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Customer ID already exists' }, { status: 409 });
  }

  // Insert customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({ customer_id, customer_name, address, mobile_number, order_id })
    .select()
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: customerError?.message || 'Failed to create customer' }, { status: 500 });
  }

  // Insert subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      customer_id: customer.id,
      start_date,
      end_date,
      status: 'active',
      is_current: true,
    });

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    customer_id: customer.id,
    action: 'customer_created',
    new_value: { customer_id, customer_name, start_date, end_date },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
