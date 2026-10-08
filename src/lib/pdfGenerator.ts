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
  const clean = dateStr.trim();
  // Already in dd/MM/yyyy format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  // If in yyyy-MM-dd format
  try {
    const parsed = parseISO(clean);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'dd/MM/yyyy');
    }
  } catch { }
  return clean;
}

export function generateCustomersPDF(customers: PDFCustomerItem[], customTitle?: string) {
  // Portrait A4 (210mm x 297mm) - Vertical format matching exact table layout
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();

  // Table Data Preparation
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

  // Table directly at the top with exact column structure and styling from screenshot
  autoTable(doc, {
    head: [['#', 'Customer ID', 'Customer Name', 'Complete Address', 'Mobile Number', 'Order ID', 'Start Date', 'End Date']],
    body: tableData.length > 0 ? tableData : [['—', '—', 'No records found', '—', '—', '—', '—', '—']],
    startY: 8,
    margin: { left: 8, right: 8, top: 8, bottom: 12 },
    styles: {
      fontSize: 7.2,
      cellPadding: { top: 2, bottom: 2, left: 1.2, right: 1.2 },
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak', // Full wrapping for address and details without clipping
    },
    headStyles: {
      fillColor: [30, 58, 138], // #1E3A8A Navy Blue matching screenshot
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
      1: { cellWidth: 19, fontStyle: 'bold' }, // Customer ID (bold matching screenshot)
      2: { cellWidth: 28 }, // Customer Name
      3: { cellWidth: 54 }, // Complete Address (full wrap)
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

  const filename = customers.length === 1
    ? `TOI_${customers[0].customer_name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(now, 'yyyyMMdd')}.pdf`
    : `TOI_Selected_Customers_${format(now, 'yyyyMMdd_HHmm')}.pdf`;

  doc.save(filename);
}
