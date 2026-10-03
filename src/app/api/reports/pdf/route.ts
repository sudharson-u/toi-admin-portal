import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';
import at from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { getMockCustomers } from '@/lib/mockData';

const autoTable = typeof at === 'function' ? at : (at as any).default || at;

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

  let reportTitle = '';
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
      reportTitle = `Subscriptions Ending in ${monthLabel}`;
    } else if (report_type === 'starting') {
      query = query
        .gte('subscriptions.start_date', monthStart)
        .lte('subscriptions.start_date', monthEnd);
      reportTitle = `Subscriptions Starting in ${monthLabel}`;
    } else if (report_type === 'active') {
      query = query
        .lte('subscriptions.start_date', monthEnd)
        .gte('subscriptions.end_date', monthStart);
      reportTitle = `Active Customers in ${monthLabel}`;
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
      reportTitle = `Renewals Completed in ${monthLabel}`;
    }

    const { data, error } = await query.order('customer_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    customers = data || [];
  } else {
    // Unconfigured mode: filter from the original TOI_RECORDS.xlsx data
    const all = getMockCustomers();

    if (report_type === 'ending') {
      reportTitle = `Subscriptions Ending in ${monthLabel}`;
      customers = all.filter(c => {
        const sub = c.subscriptions[0];
        return sub && sub.end_date >= monthStart && sub.end_date <= monthEnd;
      });
    } else if (report_type === 'starting') {
      reportTitle = `Subscriptions Starting in ${monthLabel}`;
      customers = all.filter(c => {
        const sub = c.subscriptions[0];
        return sub && sub.start_date >= monthStart && sub.start_date <= monthEnd;
      });
    } else if (report_type === 'active') {
      reportTitle = `Active Customers in ${monthLabel}`;
      customers = all.filter(c => {
        const sub = c.subscriptions[0];
        return sub && sub.start_date <= monthEnd && sub.end_date >= monthStart;
      });
    } else if (report_type === 'renewed') {
      reportTitle = `Renewals Completed in ${monthLabel}`;
      customers = all.filter(c => {
        return c.subscriptions.some(s => s.status === 'renewed');
      });
    }

    customers.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  }

  // Generate PDF in Landscape A4 (297mm x 210mm) for maximum legibility and zero truncation
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header banner
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(0, 0, 297, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('THE TIMES OF INDIA', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text('Subscription & Circulation Management • Circulation Head: Umpathy', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(reportTitle.toUpperCase(), 283, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 283, 18, { align: 'right' });

  // Meta statistics bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 28, 269, 12, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Report Period: ${monthLabel}`, 18, 35.5);
  doc.text(`Total Records Found: ${customers.length}`, 105, 35.5);
  doc.text(`Source: Master Circulation Database`, 200, 35.5);

  // Table Data Preparation
  const tableData = customers.map((c, index) => {
    const sub = c.subscriptions?.find((s: { is_current: boolean }) => s.is_current) || c.subscriptions?.[0];
    const sDate = sub?.start_date ? format(parseISO(sub.start_date), 'dd/MM/yyyy') : '—';
    const eDate = sub?.end_date ? format(parseISO(sub.end_date), 'dd/MM/yyyy') : '—';

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
    startY: 44,
    margin: { left: 14, right: 14, bottom: 16 },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak', // Full wrapping, never truncate address!
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // #
      1: { cellWidth: 26, fontStyle: 'bold' }, // Customer ID
      2: { cellWidth: 38 }, // Customer Name
      3: { cellWidth: 95 }, // Complete Address (full wrap!)
      4: { cellWidth: 26 }, // Mobile
      5: { cellWidth: 30 }, // Order ID
      6: { cellWidth: 22, halign: 'center' }, // Start Date
      7: { cellWidth: 22, halign: 'center' }, // End Date
    },
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);

      // Footer
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        148.5,
        204,
        { align: 'center' }
      );
      doc.text(
        'The Times of India • Confidential Circulation Document',
        14,
        204
      );
      doc.text(
        'For Official Circulation Use Only',
        283,
        204,
        { align: 'right' }
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
