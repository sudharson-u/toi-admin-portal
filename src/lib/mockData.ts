import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { calculateNotificationDate, calculateStatus } from './utils';

export interface MockSubscription {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  is_current: boolean;
  notification_date: string;
}

export interface MockCustomer {
  id: string;
  customer_id: string;
  customer_name: string;
  address: string;
  mobile_number: string;
  order_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  subscriptions: MockSubscription[];
}

let cachedCustomers: MockCustomer[] | null = null;

function parseDateString(s: unknown): string | null {
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

export function loadCustomersFromExcel(): MockCustomer[] {
  if (cachedCustomers) return cachedCustomers;

  try {
    const filePath = path.join(process.cwd(), 'public', 'TOI_RECORDS.xlsx');
    if (!fs.existsSync(filePath)) {
      console.warn('TOI_RECORDS.xlsx not found at', filePath);
      return [];
    }

    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', raw: false });
    const sheetName = wb.SheetNames[0] || 'Customers';
    const sheet = wb.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

    const today = new Date();
    const customers: MockCustomer[] = [];

    rawRows.forEach((r, index) => {
      const serialNo = r['Serial Number'] || (index + 1);
      const rawCustIdNotes = (r['Customer ID/Notes'] || '').trim();

      let customerId = '';
      let notes = '';

      const idMatch = rawCustIdNotes.match(/\b\d{6,10}\b/);
      if (idMatch) {
        customerId = idMatch[0];
        notes = rawCustIdNotes.replace(idMatch[0], '').replace(/^;\s*/, '').replace(/^,\s*/, '').trim();
      } else {
        customerId = '';
        notes = rawCustIdNotes;
      }

      const startDate = parseDateString(r['Start Date']) || '2025-01-01';
      const endDate = parseDateString(r['End Date']) || '2026-12-31';

      const notifDate = format(calculateNotificationDate(endDate), 'yyyy-MM-dd');
      const status = calculateStatus(endDate, today);

      customers.push({
        id: `cust-${serialNo}`,
        customer_id: customerId,
        customer_name: (r['Customer Name'] || 'Unknown').trim(),
        address: (r['Customer Address'] || '').trim(),
        mobile_number: (r['Phone Number'] || '').trim(),
        order_id: (r['Order ID'] || '').trim(),
        notes,
        created_at: `${startDate}T00:00:00Z`,
        updated_at: `${startDate}T00:00:00Z`,
        subscriptions: [{
          id: `sub-${serialNo}`,
          start_date: startDate,
          end_date: endDate,
          status,
          is_current: true,
          notification_date: notifDate,
        }],
      });
    });

    cachedCustomers = customers;
    return customers;
  } catch (err) {
    console.error('Error loading TOI_RECORDS.xlsx:', err);
    return [];
  }
}

export function getMockCustomers(): MockCustomer[] {
  if (!cachedCustomers) {
    return loadCustomersFromExcel();
  }
  return cachedCustomers;
}

export function getMockCustomerById(id: string): MockCustomer | undefined {
  const all = getMockCustomers();
  return all.find(c => c.id === id || c.customer_id === id);
}

export function addMockCustomer(newCust: {
  customer_id: string;
  customer_name: string;
  address?: string;
  mobile_number?: string;
  order_id?: string;
  start_date: string;
  end_date: string;
  notes?: string;
}): MockCustomer {
  const all = getMockCustomers();
  const today = new Date();
  const notifDate = format(calculateNotificationDate(newCust.end_date), 'yyyy-MM-dd');

  const serial = all.length + 1;
  const created: MockCustomer = {
    id: `cust-${serial}`,
    customer_id: newCust.customer_id,
    customer_name: newCust.customer_name,
    address: newCust.address || '',
    mobile_number: newCust.mobile_number || '',
    order_id: newCust.order_id || `TOI-${serial}`,
    notes: newCust.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subscriptions: [{
      id: `sub-${serial}`,
      start_date: newCust.start_date,
      end_date: newCust.end_date,
      status: calculateStatus(newCust.end_date, today),
      is_current: true,
      notification_date: notifDate,
    }],
  };

  all.unshift(created);
  return created;
}

export function renewMockSubscription(customerId: string, newEndDate: string, newStartDate?: string): boolean {
  const all = getMockCustomers();
  const cust = all.find(c => c.id === customerId || c.customer_id === customerId);
  if (!cust) return false;

  const current = cust.subscriptions.find(s => s.is_current);
  if (current) {
    current.is_current = false;
    current.status = 'renewed';
  }

  const startDate = newStartDate || current?.end_date || format(new Date(), 'yyyy-MM-dd');
  const notifDate = format(calculateNotificationDate(newEndDate), 'yyyy-MM-dd');
  const today = new Date();

  cust.subscriptions.unshift({
    id: `sub-${Date.now()}`,
    start_date: startDate,
    end_date: newEndDate,
    status: calculateStatus(newEndDate, today),
    is_current: true,
    notification_date: notifDate,
  });

  return true;
}
