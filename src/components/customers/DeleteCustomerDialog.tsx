'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, X, AlertOctagon } from 'lucide-react';

interface DeleteCustomerDialogProps {
  customerId: string;
  customerName: string;
  orderId?: string;
  phoneNumber?: string;
  onClose: () => void;
}

export default function DeleteCustomerDialog({
  customerId,
  customerName,
  orderId,
  phoneNumber,
  onClose,
}: DeleteCustomerDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      // Close and redirect to customer list
      onClose();
      router.push('/customers');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting customer');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Delete Customer Record</h2>
              <p className="text-xs text-red-100 mt-0.5">Confirmation required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-900 mb-1">
              Are you sure you want to permanently delete this customer?
            </p>
            <p className="text-xs text-red-700 leading-relaxed">
              This action cannot be undone. The customer and all of their current subscriptions, renewal history, and notes will be deleted immediately.
            </p>
          </div>

          {/* Customer Summary Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium">Customer Name:</span>
              <span className="font-bold text-gray-900">{customerName}</span>
            </div>
            {orderId && (
              <div className="flex justify-between items-center py-0.5 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">Order ID:</span>
                <span className="font-mono font-semibold text-gray-800">{orderId}</span>
              </div>
            )}
            {phoneNumber && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 font-medium">Phone Number:</span>
                <span className="font-medium text-gray-800">📞 {phoneNumber}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Record...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Customer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
