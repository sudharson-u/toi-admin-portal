import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { formatDate, calculateStatus, calculateDaysRemaining, getStatusLabel, getStatusColor } from '@/lib/utils';
import {
  Users, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw,
  TrendingUp, ArrowRight, Phone
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getMockCustomers } from '@/lib/mockData';

async function getDashboardData() {
  let customers: any[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('customers')
      .select(`
        *,
        subscriptions!inner(
          id, start_date, end_date, status, is_current, notification_date
        )
      `)
      .eq('subscriptions.is_current', true)
      .order('customer_name');
    customers = data || [];
  } else {
    customers = getMockCustomers();
  }

  const today = new Date();
  const stats = {
    total: customers?.length || 0,
    active: 0,
    expiring3Months: 0,
    expiringThisMonth: 0,
    expired: 0,
    renewed: 0,
  };

  const upcomingRenewals: typeof customers = [];

  customers?.forEach((c) => {
    const sub = c.subscriptions?.[0];
    if (!sub) return;
    const status = calculateStatus(sub.end_date, today);
    if (status === 'active') stats.active++;
    else if (status === 'renew_soon') { stats.expiring3Months++; upcomingRenewals.push(c); }
    else if (status === 'expiring_this_month') { stats.expiring3Months++; stats.expiringThisMonth++; upcomingRenewals.push(c); }
    else if (status === 'expired') stats.expired++;
    else if (status === 'renewed') stats.renewed++;
  });

  // Sort upcoming by end date
  upcomingRenewals.sort((a, b) => {
    const aDate = a.subscriptions?.[0]?.end_date || '';
    const bDate = b.subscriptions?.[0]?.end_date || '';
    return aDate.localeCompare(bDate);
  });

  return { stats, upcomingRenewals: upcomingRenewals.slice(0, 8) };
}

export default async function DashboardPage() {
  const { stats, upcomingRenewals } = await getDashboardData();

  const kpiCards = [
    { label: 'Total Customers', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Active Subscriptions', value: stats.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Expiring in 3 Months', value: stats.expiring3Months, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Expiring This Month', value: stats.expiringThisMonth, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'Already Expired', value: stats.expired, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'Recently Renewed', value: stats.renewed, icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500">Subscription overview and upcoming renewals</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {kpiCards.map((card) => (
          <div key={card.label} className={cn('kpi-card border', card.border)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={cn('p-2 rounded-xl', card.bg)}>
                <card.icon className={cn('w-5 h-5', card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Renewals */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-900">🔔 Upcoming Subscription Renewals</h2>
          </div>
          <Link
            href="/renewals"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {upcomingRenewals.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No upcoming renewals</p>
            <p className="text-xs text-gray-400 mt-1">All subscriptions are up to date</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Customer ID</th>
                    <th>Phone</th>
                    <th>Order ID</th>
                    <th>Expiry Date</th>
                    <th>Days Left</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRenewals.map((customer) => {
                    const sub = customer.subscriptions?.[0];
                    if (!sub) return null;
                    const today = new Date();
                    const status = calculateStatus(sub.end_date, today);
                    const days = calculateDaysRemaining(sub.end_date, today);
                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="font-medium text-gray-900">{customer.customer_name}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{customer.address}</div>
                        </td>
                        <td className="font-mono text-xs text-gray-600">
                          {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? customer.customer_id : '—'}
                        </td>
                        <td>
                          <a href={`tel:+91${customer.mobile_number}`}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                            <Phone className="w-3.5 h-3.5" />
                            {customer.mobile_number}
                          </a>
                        </td>
                        <td className="text-xs text-gray-500 font-mono">{customer.order_id}</td>
                        <td className="font-medium text-gray-800">{formatDate(sub.end_date)}</td>
                        <td>
                          <span className={cn(
                            'font-semibold text-sm',
                            days < 0 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-amber-600'
                          )}>
                            {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                          </span>
                        </td>
                        <td>
                          <span className={cn('status-badge', getStatusColor(status))}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                        <td>
                          <Link href={`/customers/${customer.id}`}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 whitespace-nowrap">
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {upcomingRenewals.map((customer) => {
                const sub = customer.subscriptions?.[0];
                if (!sub) return null;
                const today = new Date();
                const status = calculateStatus(sub.end_date, today);
                const days = calculateDaysRemaining(sub.end_date, today);
                return (
                  <Link key={customer.id} href={`/customers/${customer.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{customer.customer_name}</p>
                      {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? (
                        <p className="text-xs text-gray-400 font-mono">ID: {customer.customer_id}</p>
                      ) : null}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-500">Expires {formatDate(sub.end_date)}</span>
                        <span className={cn('status-badge text-[10px]', getStatusColor(status))}>
                          {getStatusLabel(status)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <span className={cn(
                        'text-lg font-bold',
                        days < 0 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-amber-600'
                      )}>
                        {days < 0 ? `${Math.abs(days)}d` : `${days}d`}
                      </span>
                      <p className="text-[10px] text-gray-400">remaining</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
