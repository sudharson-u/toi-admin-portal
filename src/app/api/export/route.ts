import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { getMockCustomers } from '@/lib/mockData';
import { formatOrderId } from '@/lib/utils';

function formatExcelDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

export async function GET(request: NextRequest) {
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'customers';

  let data: Record<string, string | number>[] = [];
  let filename = '';

  if (!configured) {
    const customers = getMockCustomers();
    data = customers.map((c, i) => {
      const sub = c.subscriptions[0];
      return {
        'S.No': i + 1,
        'Customer ID': c.customer_id || '',
        'Customer Name': c.customer_name || '',
        'Address': c.address || '',
        'Mobile Number': c.mobile_number || '',
        'Order ID': formatOrderId(c.order_id) || '',
        'Start Date': formatExcelDate(sub?.start_date),
        'End Date': formatExcelDate(sub?.end_date),
        'Notes': c.notes || '',
      };
    });
    filename = `TOI_Customers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  } else {
    const supabase = await createClient();
    if (type === 'customers') {
      const { data: customers } = await supabase
        .from('customers')
        .select(`
          customer_id, customer_name, address, mobile_number, order_id,
          subscriptions!inner(start_date, end_date, is_current)
        `)
        .eq('subscriptions.is_current', true)
        .order('customer_name');

      data = (customers || []).map((c, i) => {
        const sub = c.subscriptions?.[0];
        return {
          'S.No': i + 1,
          'Customer ID': c.customer_id && !c.customer_id.startsWith('TOI-') ? c.customer_id : '',
          'Customer Name': c.customer_name || '',
          'Address': c.address || '',
          'Mobile Number': c.mobile_number || '',
          'Order ID': formatOrderId(c.order_id) || '',
          'Start Date': formatExcelDate(sub?.start_date),
          'End Date': formatExcelDate(sub?.end_date),
        };
      });

      filename = `TOI_Customers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else {
      const { data: customers } = await supabase
        .from('customers')
        .select(`
          customer_id, customer_name, address, mobile_number, order_id,
          subscriptions(start_date, end_date, is_current, status, created_at)
        `)
        .order('customer_name');

      const rows: Record<string, string | number>[] = [];
      let i = 1;
      customers?.forEach((c) => {
        c.subscriptions?.forEach((s: { start_date: string; end_date: string; status: string; is_current: boolean }) => {
          rows.push({
            'S.No': i++,
            'Customer ID': c.customer_id && !c.customer_id.startsWith('TOI-') ? c.customer_id : '',
            'Customer Name': c.customer_name || '',
            'Address': c.address || '',
            'Mobile Number': c.mobile_number || '',
            'Order ID': formatOrderId(c.order_id) || '',
            'Start Date': formatExcelDate(s.start_date),
            'End Date': formatExcelDate(s.end_date),
            'Status': s.status || '',
            'Is Current': s.is_current ? 'Yes' : 'No',
          });
        });
      });
      data = rows;
      filename = `TOI_All_Subscriptions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    }
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 25 },
    { wch: 45 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
