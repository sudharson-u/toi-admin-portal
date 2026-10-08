'use client';

import { useState } from 'react';
import { X, Loader2, User, Phone, MapPin, Hash, Calendar } from 'lucide-react';
import { cn, formatOrderId } from '@/lib/utils';

interface AddCustomerDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCustomerDialog({ onClose, onSuccess }: AddCustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    address: '',
    mobile_number: '',
    order_id: '',
    start_date: '',
    end_date: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.start_date || !form.end_date) {
      setError('Customer Name, Start Date and End Date are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          order_id: formatOrderId(form.order_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add customer');
        setLoading(false);
        return;
      }
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add New Customer</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Customer ID + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-gray-400" /> Customer ID (Optional)
              </label>
              <input
                name="customer_id"
                value={form.customer_id}
                onChange={handleChange}
                placeholder="Leave blank if none"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" /> Full Name *
              </label>
              <input
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="e.g. Raj Kumar"
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Phone + Order ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> Mobile Number
              </label>
              <input
                name="mobile_number"
                value={form.mobile_number}
                onChange={handleChange}
                placeholder="10-digit number"
                className="form-input"
                maxLength={15}
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
                placeholder="e.g. SCT39044638, SCF56177043"
                className="form-input"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="form-label flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" /> Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Customer address..."
              rows={2}
              className="form-input resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Start Date *
              </label>
              <input
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> End Date *
              </label>
              <input
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn('btn-primary flex-1 justify-center', loading && 'opacity-70')}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
