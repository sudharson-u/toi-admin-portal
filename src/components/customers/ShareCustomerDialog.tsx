'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageSquare, X, Hash, User, Phone, Calendar, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ShareCustomerDialogProps {
  customer: {
    id: string;
    customer_id?: string;
    customer_name: string;
    address?: string;
    mobile_number?: string;
    order_id?: string;
  };
  currentSub?: {
    start_date: string;
    end_date: string;
  } | null;
  onClose: () => void;
}

export default function ShareCustomerDialog({ customer, currentSub, onClose }: ShareCustomerDialogProps) {
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const orderId = customer.order_id || 'N/A';
  const customerName = customer.customer_name || 'N/A';
  const customerAddress = customer.address || 'N/A';
  const phoneNumber = customer.mobile_number || 'N/A';
  const startDate = currentSub?.start_date ? formatDate(currentSub.start_date) : 'N/A';
  const endDate = currentSub?.end_date ? formatDate(currentSub.end_date) : 'N/A';

  const shareText = `📰 *Times of India - Customer Subscription Details*
━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Customer Name:* ${customerName}
🆔 *Order ID:* ${orderId}
📍 *Customer Address:* ${customerAddress}
📞 *Phone Number:* ${phoneNumber}
📅 *Start Date:* ${startDate}
⏳ *End Date:* ${endDate}
━━━━━━━━━━━━━━━━━━━━━━━━
Shared via TOI Circulation Portal`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `TOI Subscription: ${customerName}`,
          text: shareText,
        });
        setShareStatus('Shared successfully!');
        setTimeout(() => setShareStatus(null), 3000);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
      setShareStatus('Sharing not supported on this browser. Details copied to clipboard!');
      setTimeout(() => setShareStatus(null), 3500);
    }
  }

  function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Share Customer Details</h2>
              <p className="text-xs text-emerald-100 mt-0.5">Send directly to WhatsApp or any messaging app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Structured Details Preview */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                <Hash className="w-3.5 h-3.5 text-gray-400" /> Order ID:
              </span>
              <span className="font-mono font-bold text-gray-900">{orderId}</span>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-gray-400" /> Customer Name:
              </span>
              <span className="font-bold text-gray-900">{customerName}</span>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Number:
              </span>
              <span className="font-medium text-gray-900">{phoneNumber}</span>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Start Date:
              </span>
              <span className="font-medium text-gray-900">{startDate}</span>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> End Date:
              </span>
              <span className="font-semibold text-red-600">{endDate}</span>
            </div>

            <div className="flex items-start justify-between pt-0.5">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" /> Address:
              </span>
              <span className="text-gray-800 text-right leading-snug ml-4 text-[11px]">{customerAddress}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>Share to WhatsApp</span>
            </a>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs transition-all"
              >
                <Share2 className="w-4 h-4 text-blue-600" />
                <span>Other Apps</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>

          {shareStatus && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              {shareStatus}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
