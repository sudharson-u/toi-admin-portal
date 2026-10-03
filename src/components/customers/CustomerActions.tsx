'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Share2, Trash2 } from 'lucide-react';
import RenewDialog from './RenewDialog';
import ShareCustomerDialog from './ShareCustomerDialog';
import DeleteCustomerDialog from './DeleteCustomerDialog';

interface CustomerActionsProps {
  customerId: string;
  customer?: {
    id: string;
    customer_id?: string;
    customer_name: string;
    address?: string;
    mobile_number?: string;
    order_id?: string;
  };
  currentSub?: {
    id: string;
    start_date: string;
    end_date: string;
  };
}

export default function CustomerActions({ customerId, customer, currentSub }: CustomerActionsProps) {
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const customerObj = customer || {
    id: customerId,
    customer_name: 'Customer',
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Share Button with Share Icon */}
        <button
          type="button"
          id="share-customer-btn"
          onClick={() => setShowShareDialog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
          title="Share customer details via WhatsApp or other apps"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Share</span>
        </button>

        {/* Renew Button */}
        {currentSub && (
          <button
            type="button"
            id="renew-subscription-btn"
            onClick={() => setShowRenewDialog(true)}
            className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renew</span>
          </button>
        )}

        {/* Delete Button */}
        <button
          type="button"
          id="quick-delete-customer-btn"
          onClick={() => setShowDeleteDialog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
          title="Delete this customer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>

      {showShareDialog && (
        <ShareCustomerDialog
          customer={customerObj}
          currentSub={currentSub}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {showRenewDialog && currentSub && (
        <RenewDialog
          customerId={customerId}
          customerName={customerObj.customer_name}
          currentSub={currentSub}
          onClose={() => setShowRenewDialog(false)}
          onSuccess={() => {
            setShowRenewDialog(false);
            router.refresh();
          }}
        />
      )}

      {showDeleteDialog && (
        <DeleteCustomerDialog
          customerId={customerId}
          customerName={customerObj.customer_name}
          orderId={customerObj.order_id}
          phoneNumber={customerObj.mobile_number}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  );
}
