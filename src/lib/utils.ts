import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  subMonths,
  parseISO,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  isValid,
} from 'date-fns';
import { SubscriptionStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate notification date = end_date - 3 calendar months
 * Uses proper calendar subtraction, not 90 days.
 * e.g. 31 Dec → 30 Sep (not Sep 2nd), 15 Dec → 15 Sep
 */
export function calculateNotificationDate(endDate: Date | string): Date {
  const date = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return subMonths(date, 3);
}

/**
 * Calculate subscription status based on today's date and notification date.
 */
export function calculateStatus(
  endDate: Date | string,
  today: Date = new Date()
): SubscriptionStatus {
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const notificationDate = calculateNotificationDate(end);
  const thisMonthEnd = endOfMonth(todayStart);
  const thisMonthStart = startOfMonth(todayStart);

  if (isBefore(end, todayStart)) {
    return 'expired';
  }

  if (end >= thisMonthStart && end <= thisMonthEnd) {
    return 'expiring_this_month';
  }

  if (isAfter(todayStart, notificationDate) || todayStart >= notificationDate) {
    return 'renew_soon';
  }

  return 'active';
}

export function calculateDaysRemaining(endDate: Date | string, today: Date = new Date()): number {
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return differenceInDays(end, todayStart);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'dd/MM/yy');
  } catch {
    return '—';
  }
}

export function parseExcelDate(value: unknown): string | null {
  if (!value) return null;

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return format(date, 'yyyy-MM-dd');
  }

  if (typeof value === 'string') {
    // Try common date formats
    const patterns = [
      { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, format: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
      { regex: /^(\d{2})-(\d{2})-(\d{4})$/, format: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
      { regex: /^(\d{4})-(\d{2})-(\d{2})$/, format: (m: RegExpMatchArray) => m[0] },
      { regex: /^(\d{2})\/(\d{2})\/(\d{2})$/, format: (m: RegExpMatchArray) => `20${m[3]}-${m[2]}-${m[1]}` },
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern.regex);
      if (match) {
        const parsed = pattern.format(match);
        const date = parseISO(parsed);
        if (isValid(date)) return format(date, 'yyyy-MM-dd');
      }
    }

    // Try direct parse
    const date = new Date(value);
    if (isValid(date)) return format(date, 'yyyy-MM-dd');
  }

  if (value instanceof Date && isValid(value)) {
    return format(value, 'yyyy-MM-dd');
  }

  return null;
}

export function sanitizePhone(phone: unknown): string {
  if (!phone) return '';
  const str = String(phone).replace(/\D/g, '');
  return str;
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return clean;
  if (clean.startsWith('91') && clean.length === 12) return clean.slice(2);
  return clean;
}

export function getStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'renew_soon': return 'Renew Soon';
    case 'expiring_this_month': return 'Expiring Soon';
    case 'expired': return 'Expired';
    case 'renewed': return 'Renewed';
  }
}

export function getStatusColor(status: SubscriptionStatus): string {
  switch (status) {
    case 'active': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'renew_soon': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'expiring_this_month': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'expired': return 'text-red-700 bg-red-50 border-red-200';
    case 'renewed': return 'text-blue-700 bg-blue-50 border-blue-200';
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
