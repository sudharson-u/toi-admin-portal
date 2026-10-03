'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, X, Loader2, Calendar, ChevronRight } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface RenewDialogProps {
  customerId: string;
  customerName: string;
  currentSub: {
    id: string;
    start_date: string;
    end_date: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function RenewDialog({ customerId, customerName, currentSub, onClose, onSuccess }: RenewDialogProps) {
  const router = useRouter();

  // Auto-calculate: new start = old end + 1 day, new end = old end + 1 year
  const oldEnd = parseISO(currentSub.end_date);
  const newStartDate = new Date(oldEnd);
  newStartDate.setDate(newStartDate.getDate() + 1);
  const newEndDate = new Date(newStartDate);
  newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  newEndDate.setDate(newEndDate.getDate() - 1);

  const [newStart, setNewStart] = useState(format(newStartDate, 'yyyy-MM-dd'));
  const [newEnd, setNewEnd] = useState(format(newEndDate, 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (!newStart || !newEnd) {
      setError('Both start and end dates are required.');
      return;
    }
    if (newEnd <= newStart) {
      setError('End date must be after start date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/customers/${customerId}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_start_date: newStart, new_end_date: newEnd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to renew subscription');
        setLoading(false);
        return;
      }
      onSuccess();
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Renew Subscription</h2>
              <p className="text-xs text-gray-400">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current subscription summary */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Subscription</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(currentSub.start_date)}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-800">{formatDate(currentSub.end_date)}</span>
            </div>
          </div>

          {/* New subscription dates */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">New Subscription Period</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">New Start Date</label>
                <input
                  type="date"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">New End Date</label>
                <input
                  type="date"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {newStart && newEnd && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">New Renewal Period</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(newStart)}</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span>{formatDate(newEnd)}</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-amber-700">
              ⚠️ Previous subscription will be marked as <strong>Renewed</strong> and preserved in history. 
              A new renewal notification will be created automatically.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={cn('btn-primary flex-1 justify-center', loading && 'opacity-70')}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Renewing...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Confirm Renewal</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
