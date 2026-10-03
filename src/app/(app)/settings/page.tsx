import { Settings, Database, Bell, Shield, Newspaper } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="page-container max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-gray-600" />
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-sm text-gray-500">Application configuration and preferences</p>
      </div>

      <div className="space-y-4">
        {/* App Info */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex items-center justify-center border border-red-100 bg-red-600">
              <img src="/logo.png" alt="TOI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">THE TIMES OF INDIA</h2>
              <p className="text-xs text-gray-500">Circulation & Customer Portal</p>
              <p className="text-xs text-red-600 font-semibold mt-0.5">Main Administrator: Umapathy</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Head of Circulation</p>
              <p className="font-semibold text-gray-800">Umapathy</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Database</p>
              <p className="font-medium text-emerald-600">Connected to Cloud Supabase</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Notification Logic</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span>Renewal reminder trigger</span>
              <span className="font-semibold text-gray-900">3 calendar months before expiry</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span>Calculation method</span>
              <span className="font-semibold text-gray-900">Calendar month subtraction</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Example</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                31 Dec → 30 Sep
              </span>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-gray-900">Database</h2>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <p>✅ PostgreSQL via Supabase</p>
            <p>✅ Row Level Security (RLS) enabled</p>
            <p>✅ Authenticated-only access</p>
            <p>✅ Subscription history preserved on renewal</p>
            <p>✅ Audit trail for all changes</p>
            <p>✅ Automatic updated_at timestamps</p>
          </div>
        </div>

        {/* Security */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-900">Security</h2>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <p>✅ Supabase Auth with secure sessions</p>
            <p>✅ All API routes require authentication</p>
            <p>✅ No sensitive data in URLs</p>
            <p>✅ Environment variables for secrets</p>
            <p>✅ HTTP-only cookies for session management</p>
          </div>
        </div>

        {/* Schema reference */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Database Schema</h2>
          <div className="space-y-2">
            {[
              { table: 'customers', desc: 'Core customer records' },
              { table: 'subscriptions', desc: 'All subscription periods (history preserved)' },
              { table: 'notifications', desc: 'Renewal reminders with state tracking' },
              { table: 'audit_logs', desc: 'Complete change history' },
            ].map(item => (
              <div key={item.table} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{item.table}</code>
                <span className="text-xs text-gray-500">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
