import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import Link from 'next/link';
import { RefreshCw, Phone, ArrowRight, Calendar, Clock } from 'lucide-react';
import { formatDate, calculateStatus, calculateDaysRemaining, calculateNotificationDate, getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getMockCustomers } from '@/lib/mockData';

async function getRenewalsData() {
  const today = new Date();
  let customers: any[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('customers')
      .select(`
        id, customer_id, customer_name, address, mobile_number, order_id,
        subscriptions!inner(id, start_date, end_date, status, is_current, notification_date)
      `)
      .eq('subscriptions.is_current', true)
      .order('customer_name');
    customers = data || [];
  } else {
    customers = getMockCustomers();
  }

  const renewalRequired: typeof customers = [];
  const expiringThisMonth: typeof customers = [];
  const recentlyExpired: typeof customers = [];

  customers?.forEach((c) => {
    const sub = c.subscriptions?.[0];
    if (!sub) return;
    const status = calculateStatus(sub.end_date, today);
    if (status === 'renew_soon') renewalRequired.push(c);
    else if (status === 'expiring_this_month') expiringThisMonth.push(c);
    else if (status === 'expired') recentlyExpired.push(c);
  });

  // Sort all by end_date asc
  const sortByEnd = (a: typeof customers[0], b: typeof customers[0]) =>
    (a?.subscriptions?.[0]?.end_date || '').localeCompare(b?.subscriptions?.[0]?.end_date || '');

  return {
    renewalRequired: renewalRequired.sort(sortByEnd),
    expiringThisMonth: expiringThisMonth.sort(sortByEnd),
    recentlyExpired: recentlyExpired.sort(sortByEnd).slice(0, 20),
    today,
  };
}

function CustomerRenewalCard({ customer, today }: { customer: { id: string; customer_id: string; customer_name: string; mobile_number: string; order_id: string; subscriptions: { end_date: string; start_date: string; notification_date: string }[] }, today: Date }) {
  const sub = customer.subscriptions?.[0];
  if (!sub) return null;
  const status = calculateStatus(sub.end_date, today);
  const days = calculateDaysRemaining(sub.end_date, today);
  const notifDate = calculateNotificationDate(sub.end_date);

  return (
    <div className="flex items-center justify-between py-3.5 px-4 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
          status === 'expiring_this_month' ? 'bg-orange-100 text-orange-700' :
          status === 'renew_soon' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        )}>
          {customer.customer_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{customer.customer_name}</p>
            <span className={cn('status-badge text-[10px]', getStatusColor(status))}>
              {getStatusLabel(status)}
            </span>
          </div>
          {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? (
            <p className="text-xs text-gray-400 font-mono">ID: {customer.customer_id}</p>
          ) : null}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {customer.mobile_number && (
              <a href={`tel:+91${customer.mobile_number}`}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Phone className="w-3 h-3" />{customer.mobile_number}
              </a>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3 text-gray-400" />
              Expires {formatDate(sub.end_date)}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              Reminder: {formatDate(notifDate)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          <p className={cn(
            'text-lg font-bold',
            days < 0 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-amber-600'
          )}>
            {days < 0 ? `${Math.abs(days)}d` : `${days}d`}
          </p>
          <p className="text-[10px] text-gray-400">{days < 0 ? 'expired' : 'left'}</p>
        </div>
        <Link href={`/customers/${customer.id}`}
          className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap">
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default async function RenewalsPage() {
  const { renewalRequired, expiringThisMonth, recentlyExpired, today } = await getRenewalsData();
  const totalAttention = renewalRequired.length + expiringThisMonth.length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Renewals</h1>
        </div>
        <p className="text-sm text-gray-500">
          {totalAttention > 0
            ? `${totalAttention} subscriptions require your attention`
            : 'All subscriptions are up to date'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Expiring This Month', value: expiringThisMonth.length, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Renew Soon (3mo)', value: renewalRequired.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Recently Expired', value: recentlyExpired.length, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          { label: 'Total Attention', value: totalAttention, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        ].map(card => (
          <div key={card.label} className={cn('card p-4 border', card.border)}>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className={cn('text-xs font-medium mt-1', card.color)}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Expiring This Month */}
      {expiringThisMonth.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-orange-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-900">
                🚨 Expiring This Month
              </h2>
            </div>
            <span className="text-xs text-orange-600 font-medium bg-orange-100 px-2 py-0.5 rounded-full">
              {expiringThisMonth.length} customers
            </span>
          </div>
          <div>
            {expiringThisMonth.map(c => (
              <CustomerRenewalCard key={c.id} customer={c} today={today} />
            ))}
          </div>
        </div>
      )}

      {/* Renew Soon */}
      {renewalRequired.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-amber-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-900">
                🔔 Renewing Soon (within 3 months)
              </h2>
            </div>
            <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
              {renewalRequired.length} customers
            </span>
          </div>
          <div>
            {renewalRequired.map(c => (
              <CustomerRenewalCard key={c.id} customer={c} today={today} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Expired */}
      {recentlyExpired.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-red-50/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="text-sm font-semibold text-gray-900">Already Expired</h2>
            </div>
            <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-0.5 rounded-full">
              {recentlyExpired.length} customers
            </span>
          </div>
          <div>
            {recentlyExpired.map(c => (
              <CustomerRenewalCard key={c.id} customer={c} today={today} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalAttention === 0 && recentlyExpired.length === 0 && (
        <div className="card text-center py-16">
          <RefreshCw className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700">All subscriptions are current!</p>
          <p className="text-sm text-gray-400 mt-1">No renewals required at this time.</p>
        </div>
      )}
    </div>
  );
}
