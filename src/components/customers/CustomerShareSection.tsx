'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageSquare, ExternalLink, Calendar, MapPin, Phone, Hash, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface CustomerShareSectionProps {
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
}

export default function CustomerShareSection({ customer, currentSub }: CustomerShareSectionProps) {
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
      setTimeout(() => setShareStatus(null), 4000);
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
    <div id="share-section" className="card p-5 border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              Share Customer Details
            </h2>
            <p className="text-[11px] text-gray-400">
              Quickly share order, contact, and subscription details to WhatsApp or any app
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy details to clipboard"
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors text-xs flex items-center gap-1"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-medium text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Structured Details Preview Box */}
      <div className="bg-slate-50/80 border border-gray-200/80 rounded-xl p-3.5 space-y-2 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 py-1 border-b sm:border-b-0 border-gray-200/50">
            <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 font-medium">Order ID:</span>
            <span className="font-mono font-bold text-gray-800 ml-auto sm:ml-0">{orderId}</span>
          </div>

          <div className="flex items-center gap-2 py-1 border-b sm:border-b-0 border-gray-200/50">
            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 font-medium">Customer:</span>
            <span className="font-bold text-gray-900 truncate ml-auto sm:ml-0">{customerName}</span>
          </div>

          <div className="flex items-center gap-2 py-1 border-b sm:border-b-0 border-gray-200/50">
            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 font-medium">Phone:</span>
            <span className="font-medium text-gray-800 ml-auto sm:ml-0">{phoneNumber}</span>
          </div>

          <div className="flex items-center gap-2 py-1 border-b sm:border-b-0 border-gray-200/50">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 font-medium">Start Date:</span>
            <span className="font-medium text-gray-800 ml-auto sm:ml-0">{startDate}</span>
          </div>

          <div className="flex items-center gap-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-gray-500 font-medium">End Date:</span>
            <span className="font-semibold text-red-600 ml-auto sm:ml-0">{endDate}</span>
          </div>

          <div className="flex items-start gap-2 py-1 sm:col-span-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-500 font-medium flex-shrink-0">Address:</span>
            <span className="text-gray-700 text-[11px] leading-snug truncate sm:whitespace-normal">{customerAddress}</span>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-all flex-1 justify-center sm:flex-initial"
        >
          <MessageSquare className="w-4 h-4 fill-white" />
          <span>Share to WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs transition-all flex-1 justify-center sm:flex-initial"
        >
          <Share2 className="w-4 h-4 text-blue-600" />
          <span>Share to Other Apps</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100/80 hover:bg-gray-200/80 transition-all flex-1 justify-center sm:flex-initial"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
        </button>
      </div>

      {shareStatus && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          {shareStatus}
        </div>
      )}
    </div>
  );
}
