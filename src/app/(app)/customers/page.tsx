'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Plus, Phone, ArrowUpDown, ChevronLeft, ChevronRight, X, Download, MapPin, CheckSquare, Square, FileText } from 'lucide-react';
import { formatDate, calculateStatus, calculateDaysRemaining, getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import { SubscriptionStatus } from '@/lib/types';
import AddCustomerDialog from '@/components/customers/AddCustomerDialog';
import { generateCustomersPDF } from '@/lib/pdfGenerator';

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
  const [selectedCustomersMap, setSelectedCustomersMap] = useState<Map<string, CustomerRow>>(new Map());

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

      // Keep selected customers fresh if any of them were fetched in this batch
      setSelectedCustomersMap(prev => {
        let changed = false;
        const next = new Map(prev);
        (data.customers || []).forEach((c: CustomerRow) => {
          if (next.has(c.id)) {
            next.set(c.id, c);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, statusFilter, expiryFilter, sortBy, sortDir, page]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(fetchCustomers, 150);
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

  // Selection Logic for Selected Customer(s) PDF Export
  function toggleSelectCustomer(customer: CustomerRow) {
    setSelectedCustomersMap(prev => {
      const next = new Map(prev);
      if (next.has(customer.id)) next.delete(customer.id);
      else next.set(customer.id, customer);
      return next;
    });
  }

  const allVisibleSelected = customers.length > 0 && customers.every(c => selectedCustomersMap.has(c.id));

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedCustomersMap(prev => {
        const next = new Map(prev);
        customers.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedCustomersMap(prev => {
        const next = new Map(prev);
        customers.forEach(c => next.set(c.id, c));
        return next;
      });
    }
  }

  function handleDownloadSelectedPDF() {
    const selected = Array.from(selectedCustomersMap.values());
    if (selected.length === 0) return;
    generateCustomersPDF(
      selected,
      selected.length === 1
        ? `${selected[0].customer_name} - Dossier`
        : `${selected.length} Selected Customers Report`
    );
  }

  function handleDownloadSingleCustomer(c: CustomerRow) {
    generateCustomersPDF([c], `${c.customer_name} - Dossier`);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const today = new Date();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{total} total records</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          {/* Quick Selected Action Button if any selected */}
          {selectedCustomersMap.size > 0 && (
            <button
              type="button"
              id="download-selected-pdf-btn"
              onClick={handleDownloadSelectedPDF}
              className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 border-blue-600"
              title="Download PDF of selected customers"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Selected PDF ({selectedCustomersMap.size})</span>
            </button>
          )}

          <Link href="/import" className="btn-secondary text-xs py-2 px-3">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </Link>
          <button
            id="add-customer-btn"
            onClick={() => setShowAddDialog(true)}
            className="btn-primary text-xs py-2 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky Selected Banner when customers are chosen */}
      {selectedCustomersMap.size > 0 && (
        <div className="card p-3 mb-4 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-3 fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold font-mono flex items-center justify-center">
              {selectedCustomersMap.size}
            </span>
            <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-200">
              {selectedCustomersMap.size} customer{selectedCustomersMap.size > 1 ? 's' : ''} selected for PDF download
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSelectedPDF}
              className="btn-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 border-blue-600"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCustomersMap(new Map())}
              className="btn-ghost text-xs py-1.5 px-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="card p-4 mb-4 space-y-3 border border-gray-200 dark:border-[#222E45]">
        {/* Search bar with perfect icon alignment and padding */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            id="customer-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, ID, phone, order ID, address or date..."
            className="form-input input-with-search pr-10 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as SubscriptionStatus | ''); setPage(1); }}
            className="form-input w-auto min-w-[140px] py-1.5 text-xs sm:text-sm"
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
            className="form-input w-auto min-w-[160px] py-1.5 text-xs sm:text-sm"
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
            className="form-input w-auto min-w-[160px] py-1.5 text-xs sm:text-sm"
          >
            <option value="customer_name:asc">Name A–Z</option>
            <option value="customer_name:desc">Name Z–A</option>
            <option value="end_date:asc">Expiry (Earliest)</option>
            <option value="end_date:desc">Expiry (Latest)</option>
            <option value="start_date:asc">Start Date (Earliest)</option>
            <option value="customer_id:asc">Customer ID</option>
          </select>

          {(search || statusFilter || expiryFilter) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table & Cards Container */}
      <div className="card overflow-hidden border border-gray-200 dark:border-[#222E45]">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-14">
            <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No customers found</p>
            {(search || statusFilter) && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {/* Checkbox select column */}
                    <th className="w-10 px-3 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                        title={allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                      >
                        {allVisibleSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
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
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
                        >
                          {col.label}
                          <ArrowUpDown className={cn('w-3 h-3', sortBy === col.key ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600')} />
                        </button>
                      </th>
                    ))}
                    <th>Status</th>
                    <th className="text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const sub = customer.subscriptions?.[0];
                    const status = sub ? calculateStatus(sub.end_date, today) : 'expired';
                    const days = sub ? calculateDaysRemaining(sub.end_date, today) : null;
                    const isSelected = selectedCustomersMap.has(customer.id);

                    return (
                      <tr key={customer.id} className={cn(isSelected && 'bg-blue-50/50 dark:bg-blue-950/20')}>
                        {/* Row Checkbox */}
                        <td className="px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectCustomer(customer)}
                            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                            title="Select customer for PDF export"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? customer.customer_id : '—'}
                        </td>

                        {/* Customer Name & Address */}
                        <td>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{customer.customer_name}</div>
                          {customer.address ? (
                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px]" title={customer.address}>
                              {customer.address}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <a href={`tel:+91${customer.mobile_number}`}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                            <Phone className="w-3.5 h-3.5" />
                            {customer.mobile_number}
                          </a>
                        </td>

                        <td className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">{customer.order_id}</td>
                        <td className="text-sm font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">{sub ? formatDate(sub.start_date) : '—'}</td>
                        <td className="text-sm font-medium font-mono text-gray-800 dark:text-gray-200 whitespace-nowrap">{sub ? formatDate(sub.end_date) : '—'}</td>

                        <td>
                          <div className="flex items-center gap-2">
                            <span className={cn('status-badge', getStatusColor(status))}>
                              {getStatusLabel(status)}
                            </span>
                            {days !== null && (
                              <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{days}d</span>
                            )}
                          </div>
                        </td>

                        <td className="text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleCustomer(customer)}
                              className="text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1"
                              title="Download PDF for this customer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <Link href={`/customers/${customer.id}`}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-1">
                              View
                            </Link>
                            <Link href={`/customers/${customer.id}/edit`}
                              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-1">
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

            {/* Mobile Cards with Address Display and Selection */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-[#222E45]">
              {customers.map((customer) => {
                const sub = customer.subscriptions?.[0];
                const status = sub ? calculateStatus(sub.end_date, today) : 'expired';
                const days = sub ? calculateDaysRemaining(sub.end_date, today) : null;
                const isSelected = selectedCustomersMap.has(customer.id);

                return (
                  <div key={customer.id} className={cn('p-4 transition-colors', isSelected && 'bg-blue-50/60 dark:bg-blue-950/20')}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Mobile Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelectCustomer(customer)}
                          className="mt-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer flex-shrink-0"
                          title="Select customer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4.5 h-4.5" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight">{customer.customer_name}</p>
                          {customer.customer_id && !customer.customer_id.startsWith('TOI-') ? (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">ID: {customer.customer_id}</p>
                          ) : null}

                          {/* Customer Address Below Customer Name */}
                          {customer.address && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-start gap-1 leading-relaxed">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{customer.address}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <span className={cn('status-badge text-[10px] whitespace-nowrap', getStatusColor(status))}>
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 my-3 pt-1">
                      <div>
                        <span className="font-medium text-gray-400 dark:text-gray-500 text-[11px]">Phone</span>
                        <p>
                          <a href={`tel:+91${customer.mobile_number}`} className="text-blue-600 dark:text-blue-400 font-medium">
                            📞 {customer.mobile_number}
                          </a>
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400 dark:text-gray-500 text-[11px]">Order ID</span>
                        <p className="font-mono">{customer.order_id}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400 dark:text-gray-500 text-[11px]">Start</span>
                        <p className="font-mono whitespace-nowrap">{sub ? formatDate(sub.start_date) : '—'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400 dark:text-gray-500 text-[11px]">Expires</span>
                        <p className="font-medium font-mono text-gray-700 dark:text-gray-200 whitespace-nowrap">{sub ? formatDate(sub.end_date) : '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleCustomer(customer)}
                        className="btn-secondary text-xs py-1.5 px-2.5 rounded-lg inline-flex items-center gap-1"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>PDF</span>
                      </button>
                      <Link href={`/customers/${customer.id}`}
                        className="btn-primary text-xs py-1.5 flex-1 justify-center rounded-lg">
                        View Profile
                      </Link>
                      <Link href={`/customers/${customer.id}/edit`}
                        className="btn-secondary text-xs py-1.5 flex-1 justify-center rounded-lg">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-[#222E45]">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
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
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400 px-2">
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
