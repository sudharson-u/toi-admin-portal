const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, '../public/TOI_RECORDS.xlsx');
const wb = xlsx.readFile(filePath, { raw: false });
const sheet = wb.Sheets['Customers'];
const rows = xlsx.utils.sheet_to_json(sheet, { raw: false });

function parseDate(s) {
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

console.log('Total rows:', rows.length);

let validCount = 0;
let errors = [];

const parsedRecords = rows.map((r, i) => {
  const serialNo = r['Serial Number'] || (i + 1);
  const rawCustIdNotes = (r['Customer ID/Notes'] || '').trim();
  
  // Extract numeric Customer ID if available, otherwise use serial number
  let customerId = '';
  let notes = '';

  const idMatch = rawCustIdNotes.match(/\b\d{6,10}\b/);
  if (idMatch) {
    customerId = idMatch[0];
    notes = rawCustIdNotes.replace(idMatch[0], '').replace(/^;\s*/, '').replace(/^,\s*/, '').trim();
  } else if (rawCustIdNotes) {
    notes = rawCustIdNotes;
    customerId = `TOI-${String(serialNo).padStart(4, '0')}`;
  } else {
    customerId = `TOI-${String(serialNo).padStart(4, '0')}`;
  }

  const startDate = parseDate(r['Start Date']);
  const endDate = parseDate(r['End Date']);

  if (!startDate || !endDate) {
    errors.push({ row: i + 1, error: 'Missing date', r });
  } else {
    validCount++;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Calculate status
  const end = new Date(endDate + 'T00:00:00');
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // 3 calendar months before
  const notifDate = new Date(end);
  notifDate.setMonth(notifDate.getMonth() - 3);

  let status = 'active';
  if (end < todayStart) {
    status = 'expired';
  } else if (end >= thisMonthStart && end <= thisMonthEnd) {
    status = 'expiring_this_month';
  } else if (todayStart >= notifDate) {
    status = 'renew_soon';
  }

  return {
    serialNo,
    orderId: (r['Order ID'] || '').trim(),
    customerName: (r['Customer Name'] || '').trim(),
    address: (r['Customer Address'] || '').trim(),
    mobileNumber: (r['Phone Number'] || '').trim(),
    startDate,
    endDate,
    customerId,
    notes,
    status,
    notificationDate: notifDate.toISOString().split('T')[0],
  };
});

console.log('Valid records parsed:', validCount, 'Errors:', errors.length);

const stats = { active: 0, renew_soon: 0, expiring_this_month: 0, expired: 0 };
parsedRecords.forEach(r => stats[r.status]++);
console.log('Real 294 customer status stats as of', new Date().toISOString().split('T')[0], ':', stats);

const upcomingRenewals = parsedRecords.filter(r => r.status === 'renew_soon' || r.status === 'expiring_this_month');
console.log('Upcoming renewals count:', upcomingRenewals.length);
console.log('Sample upcoming renewals:');
upcomingRenewals.slice(0, 5).forEach(r => {
  console.log(`- ${r.customerName} (${r.customerId}): Exp: ${r.endDate}, Notif: ${r.notificationDate}, Status: ${r.status}`);
});
