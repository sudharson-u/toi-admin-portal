import { jsPDF } from 'jspdf';
import at from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

const autoTable = typeof at === 'function' ? at : (at as any).default || at;

export interface PDFCustomerItem {
  id?: string;
  customer_id?: string;
  customer_name: string;
  address?: string;
  mobile_number?: string;
  order_id?: string;
  subscriptions?: Array<{
    start_date?: string;
    end_date?: string;
    status?: string;
    is_current?: boolean;
  }>;
}

function formatDateSafe(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

export function generateCustomersPDF(customers: PDFCustomerItem[], customTitle?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const title = customTitle || (customers.length === 1 ? 'Customer Subscription Profile' : 'Selected Customers Report');
  const now = new Date();
  const dateFormatted = format(now, 'dd MMM yyyy, hh:mm a');

  // Header Banner: Times of India Navy
  doc.setFillColor(30, 58, 138); // #1E3A8A
  doc.rect(0, 0, 297, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('THE TIMES OF INDIA', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text('Subscription & Circulation Management • Circulation Head: Umapathy', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), 283, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`Generated: ${dateFormatted}`, 283, 18, { align: 'right' });

  // Metadata Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 28, 269, 11, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Scope: ${customers.length === 1 ? customers[0].customer_name : 'Selected Subscriptions'}`, 18, 35);
  doc.text(`Total Records: ${customers.length}`, 115, 35);
  doc.text(`Source: Master Circulation Database`, 205, 35);

  // Table Data
  const tableData = customers.map((c, index) => {
    const sub = c.subscriptions?.find(s => s.is_current) || c.subscriptions?.[0];
    const sDate = formatDateSafe(sub?.start_date);
    const eDate = formatDateSafe(sub?.end_date);
    const custId = c.customer_id && !c.customer_id.startsWith('TOI-') ? c.customer_id : '—';

    return [
      String(index + 1),
      custId,
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
    body: tableData.length > 0 ? tableData : [['—', '—', 'No records found', '—', '—', '—', '—', '—']],
    startY: 43,
    margin: { left: 14, right: 14, bottom: 16 },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
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
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 42 },
      3: { cellWidth: 92 },
      4: { cellWidth: 26 },
      5: { cellWidth: 30 },
      6: { cellWidth: 21, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
    },
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);

      doc.text(`Page ${data.pageNumber} of ${pageCount}`, 148.5, 204, { align: 'center' });
      doc.text('The Times of India • Confidential Circulation Document', 14, 204);
      doc.text('For Official Circulation Use Only', 283, 204, { align: 'right' });
    },
  });

  const filename = customers.length === 1
    ? `TOI_${customers[0].customer_name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(now, 'yyyyMMdd')}.pdf`
    : `TOI_Selected_Customers_${format(now, 'yyyyMMdd_HHmm')}.pdf`;

  doc.save(filename);
}
