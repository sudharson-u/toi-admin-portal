'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, Check, AlertCircle, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface ImportPreviewRow {
  row: number;
  customer_id: string;
  customer_name: string;
  address: string;
  mobile_number: string;
  order_id: string;
  start_date: string;
  end_date: string;
  valid: boolean;
  errors: string[];
}

interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}

export default function ImportExportPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setParseError('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }
    setFile(f);
    setParseError('');
    setPreview([]);
    setImportResult(null);
    setParsing(true);

    const formData = new FormData();
    formData.append('file', f);

    try {
      const res = await fetch('/api/import/preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || 'Failed to parse file');
      } else {
        setPreview(data.rows || []);
      }
    } catch {
      setParseError('Failed to parse file. Please try again.');
    }
    setParsing(false);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || 'Import failed');
      } else {
        setImportResult(data);
        setPreview([]);
        setFile(null);
      }
    } catch {
      setParseError('Import failed. Please try again.');
    }
    setImporting(false);
  }

  async function handleExport(type: 'customers' | 'full') {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (!res.ok) {
        alert('Export failed. Please try again.');
        setExportLoading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'customers'
        ? `TOI_Customers_${new Date().toISOString().split('T')[0]}.xlsx`
        : `TOI_Full_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed.');
    }
    setExportLoading(false);
  }

  const validRows = preview.filter(r => r.valid);
  const invalidRows = preview.filter(r => !r.valid);

  return (
    <div className="page-container max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-5 h-5 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">Import / Export</h1>
        </div>
        <p className="text-sm text-gray-500">Import customers from Excel or export your data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Import section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dropzone */}
          <div
            className={cn(
              'card p-8 border-2 border-dashed text-center cursor-pointer transition-all',
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
            )}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileInput}
              id="excel-file-input"
            />
            <FileSpreadsheet className={cn('w-12 h-12 mx-auto mb-3', dragOver ? 'text-blue-500' : 'text-gray-300')} />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {file ? file.name : 'Drop your Excel file here'}
            </p>
            <p className="text-xs text-gray-400">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'or click to browse — .xlsx, .xls, .csv supported'}
            </p>
            {parsing && (
              <div className="flex items-center justify-center gap-2 mt-3 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Parsing file...</span>
              </div>
            )}
          </div>

          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{parseError}</p>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Import Preview</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {validRows.length} valid · {invalidRows.length} with errors
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPreview([]); setFile(null); }}
                    className="btn-ghost text-xs py-1.5 px-2.5"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                  <button
                    id="confirm-import-btn"
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0}
                    className={cn('btn-primary text-sm', (importing || validRows.length === 0) && 'opacity-60')}
                  >
                    {importing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Import {validRows.length} Records</>
                    )}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Customer ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Order ID</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map(row => (
                      <tr key={row.row} className={cn(!row.valid && 'bg-red-50/30')}>
                        <td className="text-gray-400 text-xs">{row.row}</td>
                        <td className="font-mono text-xs">{row.customer_id || '—'}</td>
                        <td className="max-w-[140px] truncate">{row.customer_name || '—'}</td>
                        <td className="text-xs text-gray-500">{row.mobile_number || '—'}</td>
                        <td className="text-xs font-mono text-gray-500">{row.order_id || '—'}</td>
                        <td className="text-xs">{row.start_date ? formatDate(row.start_date) : '—'}</td>
                        <td className="text-xs">{row.end_date ? formatDate(row.end_date) : '—'}</td>
                        <td>
                          {row.valid ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600" title={row.errors.join(', ')}>
                              <AlertCircle className="w-3 h-3" /> {row.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 50 && (
                <p className="text-xs text-center text-gray-400 py-2 border-t border-gray-50">
                  Showing first 50 of {preview.length} rows
                </p>
              )}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Import Complete</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Processed', value: importResult.total, color: 'text-gray-600' },
                  { label: 'Imported', value: importResult.imported, color: 'text-emerald-600' },
                  { label: 'Updated', value: importResult.updated, color: 'text-blue-600' },
                  { label: 'Skipped/Errors', value: importResult.skipped + importResult.errors.length, color: 'text-red-600' },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowAllErrors(!showAllErrors)}
                    className="flex items-center gap-1 text-xs text-red-600 font-medium mb-2"
                  >
                    {showAllErrors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {importResult.errors.length} errors
                  </button>
                  {showAllErrors && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                          Row {err.row}: {err.field} — {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export + column mapping */}
        <div className="space-y-4">
          {/* Export */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export Data
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => handleExport('customers')}
                disabled={exportLoading}
                className="btn-secondary w-full justify-start text-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <div className="text-left">
                  <p>Export Customers</p>
                  <p className="text-xs text-gray-400 font-normal">All customers + current subscriptions</p>
                </div>
              </button>
              <button
                onClick={() => handleExport('full')}
                disabled={exportLoading}
                className="btn-secondary w-full justify-start text-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <div className="text-left">
                  <p>Full Database Export</p>
                  <p className="text-xs text-gray-400 font-normal">Customers + all subscription history</p>
                </div>
              </button>
            </div>
          </div>

          {/* Expected columns */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Expected Excel Columns</h2>
            <div className="space-y-1.5 text-xs">
              {[
                ['Serial Number', 'Optional'],
                ['Order ID', 'Recommended'],
                ['Customer Name', 'Required'],
                ['Customer Address', ''],
                ['Phone Number', ''],
                ['Start Date', 'Required'],
                ['End Date', 'Required'],
                ['Customer ID/Notes', 'Required'],
              ].map(([col, req]) => (
                <div key={col} className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">{col}</span>
                  {req && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full',
                      req === 'Required' ? 'bg-red-50 text-red-600' :
                      req === 'Recommended' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-50 text-gray-400'
                    )}>{req}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="card p-5 bg-blue-50 border-blue-100">
            <h2 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Tips</h2>
            <ul className="space-y-1.5 text-xs text-blue-600">
              <li>• Dates can be DD/MM/YYYY or Excel serial numbers</li>
              <li>• Duplicate Customer IDs will be updated, not duplicated</li>
              <li>• Phone numbers — leading zeros preserved</li>
              <li>• The original Excel file is never modified</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
