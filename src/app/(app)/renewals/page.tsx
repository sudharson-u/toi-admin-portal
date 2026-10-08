import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { RefreshCw } from 'lucide-react';
import { calculateStatus, cn } from '@/lib/utils';
import { getMockCustomers } from '@/lib/mockData';
import RenewalCustomerCard from '@/components/renewals/RenewalCustomerCard';

async function getRenewalsData() {
  const today = new Date();
  let customers: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, customer_id, customer_name, address, mobile_number, order_id,
          subscriptions!inner(id, start_date, end_date, status, is_current, notification_date)
        `)
        .eq('subscriptions.is_current', true)
        .order('customer_name');

      if (!error && data && data.length > 0) {
        customers = data;
      } else {
        customers = getMockCustomers();
      }
    } catch {
      customers = getMockCustomers();
    }
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
    todayIso: today.toISOString(),
  };
}

export default async function RenewalsPage() {
  const { renewalRequired, expiringThisMonth, recentlyExpired, todayIso } = await getRenewalsData();
  const totalAttention = renewalRequired.length + expiringThisMonth.length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Renewals</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalAttention > 0
            ? `${totalAttention} subscriptions require your attention`
            : 'All subscriptions are up to date'}
        </p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Expiring This Month', value: expiringThisMonth.length, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50/50 dark:bg-orange-950/20', border: 'border-orange-200/80 dark:border-orange-900/50' },
          { label: 'Renew Soon (3mo)', value: renewalRequired.length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-950/20', border: 'border-amber-200/80 dark:border-amber-900/50' },
          { label: 'Recently Expired', value: recentlyExpired.length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50/50 dark:bg-red-950/20', border: 'border-red-200/80 dark:border-red-900/50' },
          { label: 'Total Attention', value: totalAttention, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50/50 dark:bg-blue-950/20', border: 'border-blue-200/80 dark:border-blue-900/50' },
        ].map(card => (
          <div key={card.label} className={cn('card p-4 border', card.bg, card.border)}>
            <p className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100 tracking-tight">{card.value}</p>
            <p className={cn('text-xs font-medium mt-1', card.color)}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Expiring This Month */}
      {expiringThisMonth.length > 0 && (
        <div className="card overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-orange-100/70 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-950/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                🚨 Expiring This Month
              </h2>
            </div>
            <span className="text-xs text-orange-700 dark:text-orange-300 font-semibold bg-orange-100 dark:bg-orange-900/60 border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 rounded-full">
              {expiringThisMonth.length} customers
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#222E45]">
            {expiringThisMonth.map(c => (
              <RenewalCustomerCard key={c.id} customer={c} todayString={todayIso} />
            ))}
          </div>
        </div>
      )}

      {/* Renew Soon */}
      {renewalRequired.length > 0 && (
        <div className="card overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-amber-100/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                🔔 Renewing Soon (within 3 months)
              </h2>
            </div>
            <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
              {renewalRequired.length} customers
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#222E45]">
            {renewalRequired.map(c => (
              <RenewalCustomerCard key={c.id} customer={c} todayString={todayIso} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Expired */}
      {recentlyExpired.length > 0 && (
        <div className="card overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-red-100/70 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Already Expired
              </h2>
            </div>
            <span className="text-xs text-red-700 dark:text-red-300 font-semibold bg-red-100 dark:bg-red-900/60 border border-red-200 dark:border-red-800 px-2.5 py-0.5 rounded-full">
              {recentlyExpired.length} customers
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#222E45]">
            {recentlyExpired.map(c => (
              <RenewalCustomerCard key={c.id} customer={c} todayString={todayIso} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalAttention === 0 && recentlyExpired.length === 0 && (
        <div className="card text-center py-16">
          <RefreshCw className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">All subscriptions are current!</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No renewals required at this time.</p>
        </div>
      )}
    </div>
  );
}
