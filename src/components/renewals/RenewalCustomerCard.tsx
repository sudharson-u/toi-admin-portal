'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Phone, ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import { formatDate, calculateStatus, calculateDaysRemaining, calculateNotificationDate, getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import RenewDialog from '@/components/customers/RenewDialog';

export interface RenewalCustomer {
  id: string;
  customer_id: string;
  customer_name: string;
  address?: string;
  mobile_number: string;
  order_id: string;
  subscriptions: Array<{
    id: string;
    start_date: string;
    end_date: string;
    notification_date?: string;
  }>;
}

interface RenewalCustomerCardProps {
  customer: RenewalCustomer;
  todayString?: string;
}

export default function RenewalCustomerCard({ customer, todayString }: RenewalCustomerCardProps) {
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const router = useRouter();

  const sub = customer.subscriptions?.[0];
  if (!sub) return null;

  const today = todayString ? new Date(todayString) : new Date();
  const status = calculateStatus(sub.end_date, today);
  const days = calculateDaysRemaining(sub.end_date, today);
  const notifDate = calculateNotificationDate(sub.end_date);

  const initial = (customer.customer_name || 'C').charAt(0).toUpperCase();

  return (
    <>
      <div className="p-4 sm:p-5 hover:bg-gray-50/80 dark:hover:bg-[#1F293D]/50 transition-colors border-b border-gray-100 dark:border-[#222E45] last:border-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left section: Avatar & Details */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {/* Avatar */}
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-2xs mt-0.5',
                status === 'expiring_this_month'
                  ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/60'
                  : status === 'renew_soon'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60'
              )}
            >
              {initial}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {/* Name & Status Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  {customer.customer_name}
                </h3>
                <span className={cn('status-badge text-[10px] whitespace-nowrap', getStatusColor(status))}>
                  {getStatusLabel(status)}
                </span>
              </div>

              {/* Customer ID if present */}
              {customer.customer_id && !customer.customer_id.startsWith('TOI-') && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                  ID: {customer.customer_id}
                </p>
              )}

              {/* Customer Address - Prominently Displayed Below Customer Name */}
              {customer.address ? (
                <div className="flex items-start gap-1.5 mt-1 text-xs text-gray-600 dark:text-gray-300">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-relaxed">{customer.address}</span>
                </div>
              ) : null}

              {/* Meta row: Phone, Expiry, Reminder */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                {customer.mobile_number && (
                  <a
                    href={`tel:+91${customer.mobile_number}`}
                    className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span>{customer.mobile_number}</span>
                  </a>
                )}

                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span>Expires <strong className="text-gray-700 dark:text-gray-200">{formatDate(sub.end_date)}</strong></span>
                </span>

                <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>Reminder: {formatDate(notifDate)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Days countdown & Shortcut Buttons */}
          <div className="flex items-center sm:items-end justify-between sm:justify-end gap-3.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-[#222E45] flex-shrink-0">
            {/* Days Left Metric */}
            <div className="text-left sm:text-right">
              <p
                className={cn(
                  'text-lg sm:text-xl font-bold font-mono tracking-tight',
                  days < 0
                    ? 'text-red-600 dark:text-red-400'
                    : days <= 30
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-amber-600 dark:text-amber-400'
                )}
              >
                {days < 0 ? `${Math.abs(days)}d` : `${days}d`}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                {days < 0 ? 'expired' : 'left'}
              </p>
            </div>

            {/* Action Buttons: Shortcut Renew + View */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id={`shortcut-renew-${customer.id}`}
                onClick={() => setShowRenewDialog(true)}
                className="btn-primary h-8 px-3 text-xs inline-flex items-center gap-1.5 rounded-lg shadow-xs cursor-pointer"
                title="Shortcut: Renew subscription directly"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renew</span>
              </button>

              <Link
                href={`/customers/${customer.id}`}
                className="btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1 rounded-lg whitespace-nowrap"
              >
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Shortcut Renew Dialog */}
      {showRenewDialog && (
        <RenewDialog
          customerId={customer.id}
          customerName={customer.customer_name}
          currentSub={{
            id: sub.id,
            start_date: sub.start_date,
            end_date: sub.end_date,
          }}
          onClose={() => setShowRenewDialog(false)}
          onSuccess={() => {
            setShowRenewDialog(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
