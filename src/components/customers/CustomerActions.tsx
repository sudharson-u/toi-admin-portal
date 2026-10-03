'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import RenewDialog from './RenewDialog';

interface CustomerActionsProps {
  customerId: string;
  currentSub?: {
    id: string;
    start_date: string;
    end_date: string;
  };
}

export default function CustomerActions({ customerId, currentSub }: CustomerActionsProps) {
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const router = useRouter();

  if (!currentSub) return null;

  return (
    <>
      <button
        id="renew-subscription-btn"
        onClick={() => setShowRenewDialog(true)}
        className="btn-primary text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        Renew Subscription
      </button>

      {showRenewDialog && (
        <RenewDialog
          customerId={customerId}
          customerName=""
          currentSub={currentSub}
          onClose={() => setShowRenewDialog(false)}
          onSuccess={() => {
            setShowRenewDialog(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
