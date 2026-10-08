const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const at = require('jspdf-autotable');
const autoTable = typeof at === 'function' ? at : at.default || at;
const { format, parseISO } = require('date-fns');

// Import mock data loader
const xlsx = require('xlsx');

const fileBuffer = fs.readFileSync(path.join(__dirname, '../public/TOI_RECORDS.xlsx'));
const wb = xlsx.read(fileBuffer, { type: 'buffer', raw: false });
const sheet = wb.Sheets['Customers'];
const rawRows = xlsx.utils.sheet_to_json(sheet, { raw: false });

function parseDateString(s) {
  if (!s) return null;
  const str = String(s).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    let [m, d, y] = parts;
    if (y.length === 2) y = '20' + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
}

const customers = rawRows.map((r, i) => {
  const serialNo = r['Serial Number'] || (i + 1);
  const rawCustIdNotes = (r['Customer ID/Notes'] || '').trim();
  let customerId = '';
  const idMatch = rawCustIdNotes.match(/\b\d{6,10}\b/);
  if (idMatch) customerId = idMatch[0];
  else customerId = `TOI-${String(serialNo).padStart(4, '0')}`;

  const startDate = parseDateString(r['Start Date']) || '2025-01-01';
  const endDate = parseDateString(r['End Date']) || '2026-12-31';

  return {
    serialNo,
    customerId,
    customerName: (r['Customer Name'] || '').trim(),
    address: (r['Customer Address'] || '').trim(),
    mobileNumber: (r['Phone Number'] || '').trim(),
    orderId: (r['Order ID'] || '').trim(),
    startDate,
    endDate,
  };
});

// Test filtering for December 2026 (when Madanlal Kataria 29412117 and Jiyavudeen 37906000 expire)
const dec2026 = customers.filter(c => c.endDate >= '2026-12-01' && c.endDate <= '2026-12-31');
console.log('December 2026 expiring customers count:', dec2026.length);

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

// Header banner
doc.setFillColor(30, 58, 138);
doc.rect(0, 0, 297, 24, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(255, 255, 255);
doc.text('THE TIMES OF INDIA', 14, 11);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(224, 231, 255);
doc.text('Subscription & Circulation Management System • Customer Report', 14, 18);

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(255, 255, 255);
doc.text('SUBSCRIPTIONS ENDING IN DECEMBER 2026', 283, 11, { align: 'right' });

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
doc.text('Report Period: December 2026', 18, 35.5);
doc.text(`Total Records Found: ${dec2026.length}`, 105, 35.5);
doc.text('Source: Master Circulation Database', 200, 35.5);

const tableData = dec2026.map((c) => [
  (c.orderId || '').replace(/[_\s]+/g, '').trim(),
  c.customerName,
  c.address,
  c.mobileNumber,
  c.startDate,
  c.endDate,
]);

autoTable(doc, {
  head: [['Order ID', 'Customer Name', 'Address', 'Mobile Number', 'Start Date', 'End Date']],
  body: tableData,
  startY: 44,
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
    0: { cellWidth: 32, fontStyle: 'bold' },
    1: { cellWidth: 40 },
    2: { cellWidth: 105 },
    3: { cellWidth: 30 },
    4: { cellWidth: 31, halign: 'center' },
    5: { cellWidth: 31, halign: 'center' },
  },
  didDrawPage: (data) => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${data.pageNumber} of ${pageCount}`, 148.5, 204, { align: 'center' });
    doc.text('The Times of India • Confidential Circulation Document', 14, 204);
    doc.text('For Official Circulation Use Only', 283, 204, { align: 'right' });
  },
});

const outPath = path.join(__dirname, '../public/sample_test_report.pdf');
const buf = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outPath, buf);
console.log('PDF written successfully to', outPath, 'Bytes:', buf.length, 'Pages:', doc.internal.getNumberOfPages());
