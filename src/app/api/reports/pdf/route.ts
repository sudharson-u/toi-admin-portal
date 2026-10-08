import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';
import at from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { getMockCustomers } from '@/lib/mockData';

const autoTable = typeof at === 'function' ? at : (at as any).default || at;

function formatDateSafe(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const clean = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  try {
    const parsed = parseISO(clean);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'dd/MM/yyyy');
    }
  } catch { }
  return clean;
}

export async function POST(request: NextRequest) {
  const configured = isSupabaseConfigured();

  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { month, year, report_type } = body;

  if (!month || !year || !report_type) {
    return NextResponse.json({ error: 'month, year, and report_type are required' }, { status: 400 });
  }

  const monthDate = new Date(year, month - 1, 1);
  const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
  const monthLabel = format(monthDate, 'MMMM yyyy');

  let customers: any[] = [];

  if (configured) {
    const supabase = await createClient();
    let query: any = supabase
      .from('customers')
      .select(`
        customer_id, customer_name, address, mobile_number, order_id,
        subscriptions!inner(start_date, end_date, is_current, status)
      `)
      .eq('subscriptions.is_current', true);

    if (report_type === 'ending') {
      query = query
        .gte('subscriptions.end_date', monthStart)
        .lte('subscriptions.end_date', monthEnd);
    } else if (report_type === 'starting') {
      query = query
        .gte('subscriptions.start_date', monthStart)
        .lte('subscriptions.start_date', monthEnd);
    } else if (report_type === 'active') {
      query = query
        .lte('subscriptions.start_date', monthEnd)
        .gte('subscriptions.end_date', monthStart);
    } else if (report_type === 'renewed') {
      const { data: renewedSubs } = await supabase
        .from('subscriptions')
        .select('customer_id')
        .eq('is_current', false)
        .eq('status', 'renewed')
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd);

      const customerIds = [...new Set(renewedSubs?.map(s => s.customer_id) || [])];
      query = supabase
        .from('customers')
        .select(`customer_id, customer_name, address, mobile_number, order_id, subscriptions(start_date, end_date, is_current)`)
        .in('id', customerIds);
    }

    const { data, error } = await query.order('customer_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    customers = data || [];
  } else {
    // Unconfigured mode: filter from the original TOI_RECORDS.xlsx data
    const all = getMockCustomers();

    if (report_type === 'ending') {
      customers = all.filter(c => {
        const sub = c.subscriptions[0];
        return sub && sub.end_date >= monthStart && sub.end_date <= monthEnd;
      });
    } else if (report_type === 'starting') {
      customers = all.filter(c => {
        const sub = c.subscriptions[0];
        return sub && sub.start_date >= monthStart && sub.start_date <= monthEnd;
      });
    } else if (report_type === 'active') {
      customers = all.filter(c => {
        const sub = c.subscriptions[0];
        return sub && sub.start_date <= monthEnd && sub.end_date >= monthStart;
      });
    } else if (report_type === 'renewed') {
      customers = all.filter(c => {
        return c.subscriptions.some(s => s.status === 'renewed');
      });
    }

    customers.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  }

  // Vertical format (Portrait A4: 210mm x 297mm)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ONLY Month at the top - zero other headers/metadata as requested
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // #1E3A8A Navy
  doc.text(monthLabel.toUpperCase(), 8, 9);

  // Table Data Preparation
  const tableData = customers.map((c, index) => {
    const sub = c.subscriptions?.find((s: { is_current: boolean }) => s.is_current) || c.subscriptions?.[0];
    const sDate = formatDateSafe(sub?.start_date);
    const eDate = formatDateSafe(sub?.end_date);

    return [
      String(index + 1),
      c.customer_id && !c.customer_id.startsWith('TOI-') ? c.customer_id : '—',
      c.customer_name || '—',
      c.address || '—',
      c.mobile_number || '—',
      c.order_id || '—',
      sDate,
      eDate,
    ];
  });

  autoTable(doc, {
    head: [['#', 'Customer ID', 'Customer Name', 'Complete Address', 'Mobile Number', 'Order ID', 'Start Date', 'End Date']],
    body: tableData.length > 0 ? tableData : [['—', '—', 'No records found for this period', '—', '—', '—', '—', '—']],
    startY: 12,
    margin: { left: 8, right: 8, top: 12, bottom: 12 },
    styles: {
      fontSize: 7.2,
      cellPadding: { top: 2, bottom: 2, left: 1.2, right: 1.2 },
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak', // Full wrapping, never truncate address!
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' }, // #
      1: { cellWidth: 19, fontStyle: 'bold' }, // Customer ID
      2: { cellWidth: 28 }, // Customer Name
      3: { cellWidth: 54 }, // Complete Address (full wrap!)
      4: { cellWidth: 21 }, // Mobile Number
      5: { cellWidth: 25 }, // Order ID
      6: { cellWidth: 20, halign: 'center' }, // Start Date on a single line
      7: { cellWidth: 20, halign: 'center' }, // End Date on a single line
    },
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        105,
        292,
        { align: 'center' }
      );
    },
  });

  const pdfBuffer = doc.output('arraybuffer');

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="TOI_${report_type.toUpperCase()}_${monthLabel.replace(' ', '_')}.pdf"`,
    },
  });
}
