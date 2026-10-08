'use client';

import { useState } from 'react';
import { StickyNote, Save, Check, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CustomerNotesSectionProps {
  customerId: string;
  initialNotes: string;
  lastUpdated?: string;
}

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
      setTimeout(() => setJustSaved(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Error saving notes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="notes-section" className="card p-5 border border-gray-200 dark:border-[#222E45]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              Customer Notes
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Internal notes and circulation remarks
            </p>
          </div>
        </div>

        {/* Status Pill */}
        {hasUnsavedChanges ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
            Unsaved Changes
          </span>
        ) : justSaved ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        ) : savedAt ? (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(savedAt), 'dd MMM yyyy, hh:mm a')}
          </span>
        ) : null}
      </div>

      {/* Text Area without default placeholder */}
      <div className="relative">
        <textarea
          id="customer-notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder=""
          rows={4}
          className="form-input text-sm resize-y min-h-[110px]"
        />
      </div>

      {error && (
        <div className="mt-2.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {justSaved && (
        <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>Notes saved successfully for this customer!</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#222E45]">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
          {notes.length} characters
        </span>
        <button
          id="save-notes-btn"
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5',
            saving && 'opacity-60 cursor-not-allowed',
            justSaved && 'bg-emerald-600 border-emerald-600 text-white'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : justSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Saved!</span>
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
