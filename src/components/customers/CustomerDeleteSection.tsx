'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import DeleteCustomerDialog from './DeleteCustomerDialog';

interface CustomerDeleteSectionProps {
  customerId: string;
  customerName: string;
  orderId?: string;
  phoneNumber?: string;
}

export default function CustomerDeleteSection({
  customerId,
  customerName,
  orderId,
  phoneNumber,
}: CustomerDeleteSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="card p-5 border border-red-200/80 bg-red-50/30 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-900 uppercase tracking-wider flex items-center gap-2">
                Delete Customer
              </h2>
              <p className="text-xs text-red-700 mt-1 max-w-lg leading-relaxed">
                Permanently delete this customer along with their complete subscription records, delivery instructions, and history. You will be prompted to confirm before deletion.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="delete-customer-btn"
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm transition-all duration-150 flex-shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Customer
          </button>
        </div>
      </div>

      {showConfirm && (
        <DeleteCustomerDialog
          customerId={customerId}
          customerName={customerName}
          orderId={orderId}
          phoneNumber={phoneNumber}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
