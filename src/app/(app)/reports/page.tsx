'use client';

import { useState } from 'react';
import { FileText, Download, Loader2, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const REPORT_TYPES = [
  { value: 'ending', label: 'Subscriptions Ending', description: 'Customers whose subscription ends in the selected month' },
  { value: 'starting', label: 'Subscriptions Starting', description: 'Customers whose subscription starts in the selected month' },
  { value: 'active', label: 'Active Customers', description: 'All customers with active subscriptions during the selected month' },
  { value: 'renewed', label: 'Renewals Completed', description: 'Customers who renewed their subscription during the selected month' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ReportsPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [reportType, setReportType] = useState('ending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 1 + i);

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, report_type: reportType }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to generate PDF');
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const monthName = MONTHS[month - 1];
      a.href = url;
      a.download = `TOI_Report_${monthName}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastGenerated(format(new Date(), 'dd MMM yyyy HH:mm'));
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  const selectedType = REPORT_TYPES.find(t => t.value === reportType);

  return (
    <div className="page-container max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        </div>
        <p className="text-sm text-gray-500">Generate professional PDF customer reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main configuration */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date selector */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Select Period
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Month</label>
                <select
                  id="report-month"
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="form-input"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Year</label>
                <select
                  id="report-year"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="form-input"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report type */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Report Type
            </h2>
            <div className="space-y-2">
              {REPORT_TYPES.map(type => (
                <label
                  key={type.value}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                    reportType === type.value
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <input
                    type="radio"
                    name="report_type"
                    value={type.value}
                    checked={reportType === type.value}
                    onChange={() => setReportType(type.value)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className={cn('text-sm font-medium', reportType === type.value ? 'text-blue-800' : 'text-gray-800')}>
                      {type.label}
                    </p>
                    <p className={cn('text-xs mt-0.5', reportType === type.value ? 'text-blue-600' : 'text-gray-500')}>
                      {type.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Generate button */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {lastGenerated && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">PDF generated and downloaded at {lastGenerated}</p>
            </div>
          )}

          <button
            id="generate-pdf-btn"
            onClick={handleGenerate}
            disabled={loading}
            className={cn('btn-primary w-full justify-center py-3 text-sm', loading && 'opacity-70')}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
            ) : (
              <><Download className="w-4 h-4" /> Generate &amp; Download PDF</>
            )}
          </button>
        </div>

        {/* Preview info */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">PDF Contents</h2>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Times of India header</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Selected month &amp; report type</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Order ID, Customer Name, Address</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Mobile Number, Start &amp; End dates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Start &amp; End dates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Page numbers + record count</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Repeating table headers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Professional A4 formatting</span>
              </div>
            </div>
          </div>

          {/* Selected summary */}
          <div className="card p-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">Selected Report</p>
            <p className="text-lg font-bold">{MONTHS[month - 1]} {year}</p>
            <p className="text-sm text-blue-200 mt-1">{selectedType?.label}</p>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Format Details</h2>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p>📄 A4 Portrait</p>
              <p>🖨️ Print-optimized</p>
              <p>📊 Server-generated (not screenshot)</p>
              <p>📅 Generated date included</p>
              <p>🔢 Record count on cover</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
