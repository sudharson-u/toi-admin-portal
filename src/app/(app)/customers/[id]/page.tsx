import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, MapPin, Hash, Calendar, Clock, RefreshCw,
  Edit, CheckCircle, AlertTriangle, XCircle, Activity, FileText, Share2, StickyNote, Trash2
} from 'lucide-react';
import { formatDate, calculateStatus, calculateDaysRemaining, calculateNotificationDate, getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import { parseISO } from 'date-fns';
import CustomerActions from '@/components/customers/CustomerActions';
import CustomerNotesSection from '@/components/customers/CustomerNotesSection';
import CustomerShareSection from '@/components/customers/CustomerShareSection';
import CustomerDeleteSection from '@/components/customers/CustomerDeleteSection';
import { getMockCustomers } from '@/lib/mockData';

async function getCustomer(id: string) {
  // If id is a mock ID or Supabase is not configured, load from memory instantly
  if (!isSupabaseConfigured() || id.startsWith('cust-')) {
    const list = getMockCustomers();
    const found = list.find(c => c.id === id || c.customer_id === id);
    if (found) {
      return {
        customer: found,
        auditLogs: [
          {
            id: 'log-1',
            action: 'customer_created',
            created_at: found.created_at,
            new_value: { customer_name: found.customer_name, customer_id: found.customer_id },
          }
        ],
        note: found.notes || '',
        noteUpdatedAt: found.updated_at || '',
      };
    }
    if (!isSupabaseConfigured()) return null;
  }

  try {
    const supabase = await createClient();

    // Query customer, audit logs, and latest note concurrently to minimize roundtrips
    const [custRes, logsRes, noteRes] = await Promise.all([
      supabase
        .from('customers')
        .select(`
          *,
          subscriptions(id, start_date, end_date, status, is_current, notification_date, created_at, updated_at)
        `)
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('audit_logs')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('audit_logs')
        .select('new_value, created_at')
        .eq('customer_id', id)
        .eq('action', 'customer_note')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let customer = custRes.data;

    // Fallback to mock data if not found in remote DB
    if (!customer) {
      const list = getMockCustomers();
      const found = list.find(c => c.id === id || c.customer_id === id);
      if (!found) return null;
      return {
        customer: found,
        auditLogs: logsRes.data || [],
        note: found.notes || '',
        noteUpdatedAt: found.updated_at || '',
      };
    }

    // Sort: current first, then by start_date desc
    customer.subscriptions = customer.subscriptions?.sort((a: { is_current: boolean; start_date: string }, b: { is_current: boolean; start_date: string }) => {
      if (a.is_current) return -1;
      if (b.is_current) return 1;
      return b.start_date.localeCompare(a.start_date);
    }) || [];

    const note = noteRes.data?.new_value?.note || (customer as any)?.notes || '';
    const noteUpdatedAt = noteRes.data?.created_at || (customer as any)?.updated_at || '';

    return { customer, auditLogs: logsRes.data || [], note, noteUpdatedAt };
  } catch (err) {
    console.error('Error fetching customer:', err);
    const found = getMockCustomers().find(c => c.id === id || c.customer_id === id);
    if (!found) return null;
    return {
      customer: found,
      auditLogs: [],
      note: found.notes || '',
      noteUpdatedAt: found.updated_at || '',
    };
  }
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCustomer(id);

  if (!result) notFound();

  const { customer, auditLogs, note, noteUpdatedAt } = result;
  const currentSub = customer.subscriptions?.find((s: { is_current: boolean }) => s.is_current);
  const historicalSubs = customer.subscriptions?.filter((s: { is_current: boolean }) => !s.is_current) || [];

  const today = new Date();
  const status = currentSub ? calculateStatus(currentSub.end_date, today) : null;
  const daysRemaining = currentSub ? calculateDaysRemaining(currentSub.end_date, today) : null;
  const notifDate = currentSub ? calculateNotificationDate(currentSub.end_date) : null;

  const statusIcons = {
    active: <CheckCircle className="w-4 h-4" />,
    renew_soon: <AlertTriangle className="w-4 h-4" />,
    expiring_this_month: <AlertTriangle className="w-4 h-4" />,
    expired: <XCircle className="w-4 h-4" />,
    renewed: <RefreshCw className="w-4 h-4" />,
  };

  return (
    <div className="page-container max-w-4xl">
      {/* Back button */}
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Profile Header */}
      <div className="card p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-2xl font-bold text-white">
              {customer.customer_name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{customer.customer_name}</h1>
              {status && (
                <span className={cn('status-badge', getStatusColor(status))}>
                  {statusIcons[status]}
                  {getStatusLabel(status)}
                </span>
              )}
            </div>
            {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? (
              <p className="text-sm text-gray-500 font-mono">Customer ID: {customer.customer_id}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No Customer ID assigned</p>
            )}
            {customer.address && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{customer.address}</span>
              </p>
            )}
            {daysRemaining !== null && (
              <p className={cn(
                'text-sm font-medium mt-1.5 font-mono',
                daysRemaining < 0 ? 'text-red-600 dark:text-red-400' :
                  daysRemaining <= 30 ? 'text-orange-600 dark:text-orange-400' :
                    daysRemaining <= 90 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'
              )}>
                {daysRemaining < 0
                  ? `Expired ${Math.abs(daysRemaining)} days ago`
                  : `${daysRemaining} days remaining`}
              </p>
            )}
          </div>

          {/* Actions - Perfectly Aligned Toolbar */}
          <div className="flex-shrink-0">
            <CustomerActions customerId={id} customer={customer} currentSub={currentSub} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Contact + Subscription */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact Card */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Mobile Number</p>
                  {customer.mobile_number ? (
                    <a
                      href={`tel:+91${customer.mobile_number}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      📞 {customer.mobile_number}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Not provided</p>
                  )}
                </div>
              </div>

              {customer.address && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="text-sm text-gray-700 leading-snug">{customer.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Subscription Card */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Current Subscription</h2>
            {currentSub ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Order ID</p>
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-sm font-mono font-medium text-gray-800">{customer.order_id || '—'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    {status && (
                      <span className={cn('status-badge', getStatusColor(status))}>
                        {statusIcons[status]}
                        {getStatusLabel(status)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Start Date</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-sm font-medium text-gray-800">{formatDate(currentSub.start_date)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">End Date</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <p className={cn(
                        'text-sm font-semibold',
                        status === 'expired' ? 'text-red-600' :
                          status === 'expiring_this_month' ? 'text-orange-600' :
                            status === 'renew_soon' ? 'text-amber-600' : 'text-gray-800'
                      )}>
                        {formatDate(currentSub.end_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {notifDate && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-amber-800">3-Month Renewal Reminder</p>
                        <p className="text-xs text-amber-600">
                          Notification scheduled for {formatDate(notifDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active subscription</p>
              </div>
            )}
          </div>

          {/* Customer Notes & Special Instructions */}
          <CustomerNotesSection
            customerId={customer.id}
            initialNotes={note}
            lastUpdated={noteUpdatedAt}
          />

          {/* Share Customer Details Section */}
          <CustomerShareSection
            customer={customer}
            currentSub={currentSub}
          />

          {/* Subscription History */}
          {historicalSubs.length > 0 && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Subscription History
              </h2>
              <div className="space-y-2">
                {historicalSubs.map((sub: {
                  id: string;
                  start_date: string;
                  end_date: string;
                  status: string;
                }) => (
                  <div key={sub.id}
                    className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      <span className="text-sm text-gray-600">
                        {formatDate(sub.start_date)} → {formatDate(sub.end_date)}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-white border border-gray-200 text-gray-500 rounded-full capitalize">
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete Customer Section */}
          <CustomerDeleteSection
            customerId={customer.id}
            customerName={customer.customer_name}
            orderId={customer.order_id}
            phoneNumber={customer.mobile_number}
          />
        </div>

        {/* Right column: Quick info + Audit */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href={`/customers/${id}/edit`}
                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors text-sm font-medium">
                <Edit className="w-4 h-4" /> Edit Customer
              </Link>
              <a href="#share-section"
                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors text-sm font-medium">
                <Share2 className="w-4 h-4 text-emerald-600" /> Share Details
              </a>
              <a href="#notes-section"
                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-amber-50 text-gray-600 hover:text-amber-700 transition-colors text-sm font-medium">
                <StickyNote className="w-4 h-4 text-amber-600" /> Add / View Notes
              </a>
              {customer.mobile_number && (
                <a href={`tel:+91${customer.mobile_number}`}
                  className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-700 transition-colors text-sm font-medium">
                  <Phone className="w-4 h-4 text-green-600" /> Call Customer
                </a>
              )}
              <Link href={`/reports`}
                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-purple-50 text-gray-600 hover:text-purple-700 transition-colors text-sm font-medium">
                <FileText className="w-4 h-4" /> Generate Report
              </Link>
            </div>
          </div>

          {/* Customer Metadata */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Total Subscriptions</p>
                <p className="font-semibold text-gray-800">{customer.subscriptions?.length || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Customer Since</p>
                <p className="font-semibold text-gray-800">
                  {customer.subscriptions?.length > 0
                    ? formatDate(customer.subscriptions[customer.subscriptions.length - 1].start_date)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Record Created</p>
                <p className="font-semibold text-gray-800">{formatDate(customer.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {auditLogs.length > 0 && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Recent Activity
              </h2>
              <div className="space-y-2">
                {auditLogs.map((log: { id: string; action: string; created_at: string }) => (
                  <div key={log.id} className="text-xs text-gray-500 py-1.5 border-b border-gray-50 last:border-0">
                    <p className="font-medium text-gray-700 capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-gray-400">{formatDate(log.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
