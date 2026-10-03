'use client';

import { useState } from 'react';
import { StickyNote, Save, Check, Loader2, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CustomerNotesSectionProps {
  customerId: string;
  initialNotes: string;
  lastUpdated?: string;
}

const QUICK_TAGS = [
  'Cheque payment received',
  'Cash payment collected',
  'Morning 6:00 AM delivery requested',
  'Leave newspaper at security gate',
  'Door lock / verify address',
  'Call before delivery',
  'Special Sunday edition requested',
  'VIP customer',
];

export default function CustomerNotesSection({
  customerId,
  initialNotes,
  lastUpdated,
}: CustomerNotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [savedNotes, setSavedNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(lastUpdated || null);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const hasUnsavedChanges = notes.trim() !== savedNotes.trim();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notes');

      setSavedNotes(notes);
      setSavedAt(data.updated_at || new Date().toISOString());
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving notes');
    } finally {
      setSaving(false);
    }
  }

  function appendTag(tag: string) {
    setNotes(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return prev;
      return `${trimmed}\n• ${tag}`;
    });
  }

  return (
    <div className="card p-5 border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              Customer Notes & Instructions
            </h2>
            <p className="text-[11px] text-gray-400">
              Delivery preferences, payment records & special remarks
            </p>
          </div>
        </div>

        {/* Status Pill */}
        {hasUnsavedChanges ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            Unsaved Changes
          </span>
        ) : justSaved ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        ) : savedAt ? (
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(savedAt), 'dd MMM yyyy, hh:mm a')}
          </span>
        ) : null}
      </div>

      {/* Text Area */}
      <div className="relative">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Type any notes regarding this customer here... (e.g. cheque number, delivery slot, alternate phone, house landmark, renewal feedback)"
          rows={4}
          className="w-full p-3 text-sm text-gray-800 placeholder:text-gray-400 bg-slate-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all resize-y min-h-[96px]"
        />
      </div>

      {/* Quick Tags */}
      <div className="mt-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span className="text-[10px] font-semibold uppercase text-gray-500 tracking-wider">Quick Suggestions</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => appendTag(tag)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100/80 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border border-gray-200 text-gray-600 transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-[11px] text-gray-400">
          {notes.length} characters
        </span>
        <button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all duration-150',
            hasUnsavedChanges
              ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving Notes...</span>
            </>
          ) : justSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Notes Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Notes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
