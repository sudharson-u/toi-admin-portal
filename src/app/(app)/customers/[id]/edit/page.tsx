'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Hash, User, Phone, MapPin, Calendar } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface CustomerData {
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
    is_current: boolean;
  }>;
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    address: '',
    mobile_number: '',
    order_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const res = await fetch(`/api/customers/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError('Customer not found');
          setLoading(false);
          return;
        }
        const c = data.customer;
        setCustomer(c);
        const currentSub = c.subscriptions?.find((s: { is_current: boolean }) => s.is_current);
        setForm({
          customer_id: c.customer_id || '',
          customer_name: c.customer_name || '',
          address: c.address || '',
          mobile_number: c.mobile_number || '',
          order_id: c.order_id || '',
          start_date: currentSub?.start_date || '',
          end_date: currentSub?.end_date || '',
        });
      } catch {
        setError('Failed to load customer');
      }
      setLoading(false);
    }
    fetchCustomer();
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_id || !form.customer_name) {
      setError('Customer ID and Name are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save changes');
        setSaving(false);
        return;
      }
      setSuccess('Changes saved successfully!');
      setSaving(false);
      setTimeout(() => router.push(`/customers/${id}`), 1200);
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-2xl space-y-4">
          <div className="skeleton h-8 w-48 rounded-lg" />
          <div className="card p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-container">
        <div className="text-center py-16">
          <p className="text-gray-500">Customer not found.</p>
          <Link href="/customers" className="btn-primary mt-4 inline-flex">Back to Customers</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl">
      <Link href={`/customers/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </Link>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-base font-semibold text-gray-900">Edit Customer</h1>
          <p className="text-xs text-gray-400 mt-0.5">{customer.customer_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* IDs */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-gray-400" /> Customer ID *
                </label>
                <input
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleChange}
                  className="form-input font-mono"
                  required
                />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-gray-400" /> Order ID
                </label>
                <input
                  name="order_id"
                  value={form.order_id}
                  onChange={handleChange}
                  className="form-input font-mono"
                />
              </div>
            </div>
          </div>

          {/* Personal */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Info</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" /> Full Name *
                </label>
                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> Mobile Number
                </label>
                <input
                  name="mobile_number"
                  value={form.mobile_number}
                  onChange={handleChange}
                  className="form-input"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={2}
                  className="form-input resize-none"
                />
              </div>
            </div>
          </div>

          {/* Subscription Dates */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Subscription Dates</h3>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-3">
              ⚠️ For renewals, use the <strong>Renew Subscription</strong> button on the profile page to preserve history.
              Only use these fields to correct a date error.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" /> Start Date
                </label>
                <input
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" /> End Date
                </label>
                <input
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Link href={`/customers/${id}`} className="btn-secondary flex-1 justify-center text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={cn('btn-primary flex-1 justify-center', saving && 'opacity-70')}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
