'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Plus, Phone, ArrowUpDown, ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { formatDate, calculateStatus, calculateDaysRemaining, getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import { SubscriptionStatus } from '@/lib/types';
import AddCustomerDialog from '@/components/customers/AddCustomerDialog';

const PAGE_SIZE = 20;

interface CustomerRow {
  id: string;
  customer_id: string;
  customer_name: string;
  address: string;
  mobile_number: string;
  order_id: string;
  subscriptions: Array<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    is_current: boolean;
    notification_date: string;
  }>;
}

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [sortBy, setSortBy] = useState('customer_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
        expiry: expiryFilter,
        sort: sortBy,
        dir: sortDir,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, statusFilter, expiryFilter, sortBy, sortDir, page]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [fetchCustomers]);

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setExpiryFilter('');
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const today = new Date();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{total} total records</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <Link href="/import" className="btn-secondary text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Link>
          <button
            id="add-customer-btn"
            onClick={() => setShowAddDialog(true)}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 mb-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="customer-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, ID, phone, order ID, address or date..."
            className="form-input pl-9"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as SubscriptionStatus | ''); setPage(1); }}
            className="form-input w-auto min-w-[140px] py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="renew_soon">Renew Soon</option>
            <option value="expiring_this_month">Expiring This Month</option>
            <option value="expired">Expired</option>
            <option value="renewed">Renewed</option>
          </select>

          <select
            id="expiry-filter"
            value={expiryFilter}
            onChange={(e) => { setExpiryFilter(e.target.value); setPage(1); }}
            className="form-input w-auto min-w-[160px] py-2 text-sm"
          >
            <option value="">All Expiry</option>
            <option value="this_month">Expiring This Month</option>
            <option value="next_month">Expiring Next Month</option>
            <option value="next_3_months">Expiring in 3 Months</option>
            <option value="expired">Already Expired</option>
          </select>

          <select
            id="sort-filter"
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [col, dir] = e.target.value.split(':');
              setSortBy(col);
              setSortDir(dir as 'asc' | 'desc');
              setPage(1);
            }}
            className="form-input w-auto min-w-[160px] py-2 text-sm"
          >
            <option value="customer_name:asc">Name A–Z</option>
            <option value="customer_name:desc">Name Z–A</option>
            <option value="end_date:asc">Expiry (Earliest)</option>
            <option value="end_date:desc">Expiry (Latest)</option>
            <option value="start_date:asc">Start Date (Earliest)</option>
            <option value="customer_id:asc">Customer ID</option>
          </select>

          {(search || statusFilter || expiryFilter) && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-14">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No customers found</p>
            {(search || statusFilter) && (
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {[
                      { key: 'customer_id', label: 'Customer ID' },
                      { key: 'customer_name', label: 'Customer' },
                      { key: 'mobile_number', label: 'Phone' },
                      { key: 'order_id', label: 'Order ID' },
                      { key: 'start_date', label: 'Start Date' },
                      { key: 'end_date', label: 'End Date' },
                    ].map(col => (
                      <th key={col.key}>
                        <button
                          onClick={() => handleSort(col.key)}
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                        >
                          {col.label}
                          <ArrowUpDown className={cn('w-3 h-3', sortBy === col.key ? 'text-blue-500' : 'text-gray-300')} />
                        </button>
                      </th>
                    ))}
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const sub = customer.subscriptions?.[0];
                    const status = sub ? calculateStatus(sub.end_date, today) : 'expired';
                    const days = sub ? calculateDaysRemaining(sub.end_date, today) : null;
                    return (
                      <tr key={customer.id}>
                        <td className="font-mono text-xs text-gray-600">
                          {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? customer.customer_id : '—'}
                        </td>
                        <td>
                          <div className="font-medium text-gray-900">{customer.customer_name}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px]" title={customer.address}>
                            {customer.address}
                          </div>
                        </td>
                        <td>
                          <a href={`tel:+91${customer.mobile_number}`}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                            <Phone className="w-3.5 h-3.5" />
                            {customer.mobile_number}
                          </a>
                        </td>
                        <td className="text-xs font-mono text-gray-500">{customer.order_id}</td>
                        <td className="text-sm text-gray-600">{sub ? formatDate(sub.start_date) : '—'}</td>
                        <td className="text-sm font-medium text-gray-800">{sub ? formatDate(sub.end_date) : '—'}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={cn('status-badge', getStatusColor(status))}>
                              {getStatusLabel(status)}
                            </span>
                            {days !== null && days >= 0 && (
                              <span className="text-xs text-gray-400">{days}d</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Link href={`/customers/${customer.id}`}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700">
                              View
                            </Link>
                            <Link href={`/customers/${customer.id}/edit`}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700">
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {customers.map((customer) => {
                const sub = customer.subscriptions?.[0];
                const status = sub ? calculateStatus(sub.end_date, today) : 'expired';
                const days = sub ? calculateDaysRemaining(sub.end_date, today) : null;
                return (
                  <div key={customer.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{customer.customer_name}</p>
                        {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? (
                          <p className="text-xs text-gray-400 font-mono">ID: {customer.customer_id}</p>
                        ) : null}
                      </div>
                      <span className={cn('status-badge text-[10px]', getStatusColor(status))}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                      <div>
                        <span className="font-medium text-gray-400">Phone</span>
                        <p>
                          <a href={`tel:+91${customer.mobile_number}`} className="text-blue-600">
                            📞 {customer.mobile_number}
                          </a>
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Order ID</span>
                        <p className="font-mono">{customer.order_id}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Start</span>
                        <p>{sub ? formatDate(sub.start_date) : '—'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Expires</span>
                        <p className="font-medium text-gray-700">{sub ? formatDate(sub.end_date) : '—'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/customers/${customer.id}`}
                        className="btn-primary text-xs py-1.5 flex-1 justify-center">
                        View Profile
                      </Link>
                      <Link href={`/customers/${customer.id}/edit`}
                        className="btn-secondary text-xs py-1.5 flex-1 justify-center">
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="btn-ghost p-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="btn-ghost p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Dialog */}
      {showAddDialog && (
        <AddCustomerDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => { setShowAddDialog(false); fetchCustomers(); }}
        />
      )}
    </div>
  );
}
