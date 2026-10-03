import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import { parseExcelDate, sanitizePhone } from '@/lib/utils';
import { addMockCustomer } from '@/lib/mockData';

// Column name mappings (case-insensitive)
const COLUMN_MAPS: Record<string, string[]> = {
  serial_number: ['serial number', 'sr', 'sr.no', 's.no', 'sno', 'serial', '#'],
  order_id: ['order id', 'orderid', 'order_id', 'order no', 'orderno'],
  customer_name: ['customer name', 'customername', 'name', 'client name', 'customer_name'],
  address: ['customer address', 'address', 'addr', 'customer address'],
  mobile_number: ['phone number', 'phone', 'mobile', 'mobile number', 'contact', 'mobile_number', 'phonenumber'],
  start_date: ['start date', 'startdate', 'start_date', 'from date', 'from'],
  end_date: ['end date', 'enddate', 'end_date', 'to date', 'to', 'expiry date', 'expiry'],
  customer_id: ['customer id', 'customerid', 'customer_id', 'cust id', 'notes', 'customer id/notes', 'id'],
};

function detectColumn(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  headers.forEach((h, i) => {
    const normalized = h.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COLUMN_MAPS)) {
      if (aliases.some(a => normalized === a || normalized.includes(a))) {
        if (!(field in mapping)) {
          mapping[field] = i;
        }
      }
    }
  });
  return mapping;
}

function parseRows(sheet: XLSX.WorkSheet) {
  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  if (raw.length < 2) return { rows: [], columnMap: {} };

  const headers = (raw[0] as string[]).map(String);
  const columnMap = detectColumn(headers);

  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (row.every(cell => !cell)) continue; // Skip empty rows

    const get = (field: string) => {
      const idx = columnMap[field];
      return idx !== undefined ? row[idx] : '';
    };

    const startDate = parseExcelDate(get('start_date'));
    const endDate = parseExcelDate(get('end_date'));
    const customerName = String(get('customer_name') || '').trim();
    const customerId = String(get('customer_id') || '').trim();
    const mobile = sanitizePhone(get('mobile_number'));

    const errors: string[] = [];
    if (!customerName) errors.push('Name required');
    if (!customerId) errors.push('Customer ID required');
    if (!startDate) errors.push('Invalid start date');
    if (!endDate) errors.push('Invalid end date');
    if (startDate && endDate && endDate < startDate) errors.push('End before start');

    rows.push({
      row: i + 1,
      customer_id: customerId,
      customer_name: customerName,
      address: String(get('address') || '').trim(),
      mobile_number: mobile,
      order_id: String(get('order_id') || '').trim(),
      start_date: startDate || '',
      end_date: endDate || '',
      valid: errors.length === 0,
      errors,
    });
  }

  return { rows, columnMap };
}

export async function POST(request: NextRequest) {
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch {
    return NextResponse.json({ error: 'Could not parse file. Ensure it is a valid Excel file.' }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const { rows } = parseRows(sheet);

  const validRows = rows.filter(r => r.valid);
  const errors: { row: number; field: string; message: string }[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  if (!configured) {
    for (const row of validRows) {
      addMockCustomer({
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        address: row.address,
        mobile_number: row.mobile_number,
        order_id: row.order_id,
        start_date: row.start_date,
        end_date: row.end_date,
      });
      imported++;
    }
    return NextResponse.json({
      success: true,
      imported,
      updated: 0,
      skipped: rows.length - validRows.length,
      errors: rows.filter(r => !r.valid).map(r => ({ row: r.row, field: 'general', message: r.errors.join(', ') })),
    });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  for (const row of validRows) {
    try {
      // Check if customer already exists
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('customer_id', row.customer_id)
        .single();

      if (existing) {
        // Update existing customer
        await supabase.from('customers')
          .update({
            customer_name: row.customer_name,
            address: row.address,
            mobile_number: row.mobile_number,
            order_id: row.order_id,
          })
          .eq('id', existing.id);

        // Update current subscription
        const { data: currentSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('customer_id', existing.id)
          .eq('is_current', true)
          .single();

        if (currentSub) {
          await supabase.from('subscriptions')
            .update({ start_date: row.start_date, end_date: row.end_date })
            .eq('id', currentSub.id);
        } else {
          await supabase.from('subscriptions').insert({
            customer_id: existing.id,
            start_date: row.start_date,
            end_date: row.end_date,
            status: 'active',
            is_current: true,
          });
        }

        updated++;
      } else {
        // Insert new customer
        const { data: customer, error: custErr } = await supabase
          .from('customers')
          .insert({
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            address: row.address,
            mobile_number: row.mobile_number,
            order_id: row.order_id,
          })
          .select('id')
          .single();

        if (custErr || !customer) {
          errors.push({ row: row.row, field: 'customer', message: custErr?.message || 'Insert failed' });
          skipped++;
          continue;
        }

        await supabase.from('subscriptions').insert({
          customer_id: customer.id,
          start_date: row.start_date,
          end_date: row.end_date,
          status: 'active',
          is_current: true,
        });

        imported++;
      }
    } catch (e) {
      errors.push({ row: row.row, field: 'unknown', message: String(e) });
      skipped++;
    }
  }

  // Invalid rows
  for (const row of rows.filter(r => !r.valid)) {
    errors.push({ row: row.row, field: row.errors[0] || 'validation', message: row.errors.join(', ') });
    skipped++;
  }

  return NextResponse.json({
    total: rows.length,
    imported,
    updated,
    skipped,
    errors,
  });
}
