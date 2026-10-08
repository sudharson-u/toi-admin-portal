'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, RefreshCw, Share2, Trash2, Download } from 'lucide-react';
import RenewDialog from './RenewDialog';
import ShareCustomerDialog from './ShareCustomerDialog';
import DeleteCustomerDialog from './DeleteCustomerDialog';
import { generateCustomersPDF } from '@/lib/pdfGenerator';

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

  function handleDownloadPDF() {
    generateCustomersPDF(
      [
        {
          id: customerId,
          customer_id: customerObj.customer_id,
          customer_name: customerObj.customer_name,
          address: customerObj.address,
          mobile_number: customerObj.mobile_number,
          order_id: customerObj.order_id,
          subscriptions: currentSub ? [{ ...currentSub, is_current: true }] : [],
        },
      ],
      `${customerObj.customer_name} - Dossier`
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Edit Button */}
        <Link
          href={`/customers/${customerId}/edit`}
          id="edit-customer-btn"
          className="btn-secondary h-9 text-xs px-3 inline-flex items-center gap-1.5 rounded-lg"
          title="Edit customer details"
        >
          <Edit className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          <span>Edit</span>
        </Link>

        {/* Share Button */}
        <button
          type="button"
          id="share-customer-btn"
          onClick={() => setShowShareDialog(true)}
          className="btn-secondary h-9 text-xs px-3 inline-flex items-center gap-1.5 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:text-emerald-700 dark:hover:text-emerald-400"
          title="Share customer details"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Share</span>
        </button>

        {/* Download PDF Button */}
        <button
          type="button"
          id="download-customer-pdf-btn"
          onClick={handleDownloadPDF}
          className="btn-secondary h-9 text-xs px-3 inline-flex items-center gap-1.5 rounded-lg hover:border-blue-300 dark:hover:border-blue-700/60 hover:text-blue-700 dark:hover:text-blue-400"
          title="Download PDF report for this customer"
        >
          <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* Renew Button */}
        {currentSub && (
          <button
            type="button"
            id="renew-subscription-btn"
            onClick={() => setShowRenewDialog(true)}
            className="btn-primary h-9 text-xs px-3 inline-flex items-center gap-1.5 rounded-lg"
            title="Renew subscription"
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
          className="h-9 px-3 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50/70 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/60 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer"
          title="Delete customer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
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
