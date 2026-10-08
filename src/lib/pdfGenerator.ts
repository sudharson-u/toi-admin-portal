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
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak', // Full wrapping for address and details without clipping
    },
    headStyles: {
      fillColor: [30, 58, 138], // #1E3A8A Navy Blue matching screenshot
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // #
      1: { cellWidth: 20, fontStyle: 'bold' }, // Customer ID (bold matching screenshot)
      2: { cellWidth: 30 }, // Customer Name
      3: { cellWidth: 58 }, // Complete Address (full wrap)
      4: { cellWidth: 22 }, // Mobile Number
      5: { cellWidth: 24 }, // Order ID
      6: { cellWidth: 16, halign: 'center' }, // Start Date
      7: { cellWidth: 16, halign: 'center' }, // End Date
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
