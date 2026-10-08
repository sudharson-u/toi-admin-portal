import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import { parseExcelDate, sanitizePhone, formatOrderId } from '@/lib/utils';

const COLUMN_MAPS: Record<string, string[]> = {
  serial_number: ['serial number', 'sr', 'sr.no', 's.no', 'sno', 'serial', '#'],
  order_id: ['order id', 'orderid', 'order_id', 'order no', 'orderno'],
  customer_name: ['customer name', 'customername', 'name', 'client name', 'customer_name'],
  address: ['customer address', 'address', 'addr'],
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
        if (!(field in mapping)) mapping[field] = i;
      }
    }
  });
  return mapping;
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
    return NextResponse.json({ error: 'Could not parse file.' }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

  if (raw.length < 2) {
    return NextResponse.json({ error: 'File appears to be empty.' }, { status: 400 });
  }

  const headers = (raw[0] as string[]).map(String);
  const columnMap = detectColumn(headers);
  const rows = [];

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (row.every(cell => !cell)) continue;

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
    if (startDate && endDate && endDate < startDate) errors.push('End date before start date');

    rows.push({
      row: i + 1,
      customer_id: customerId,
      customer_name: customerName,
      address: String(get('address') || '').trim(),
      mobile_number: mobile,
      order_id: formatOrderId(String(get('order_id') || '')),
      start_date: startDate || '',
      end_date: endDate || '',
      valid: errors.length === 0,
      errors,
    });
  }

  return NextResponse.json({ rows, columnMap });
}
