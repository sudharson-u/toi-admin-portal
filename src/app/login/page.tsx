'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Newspaper, Eye, EyeOff, Loader2 } from 'lucide-react';
import InstallPwaButton from '@/components/layout/InstallPwaButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isConfigured) {
      try {
        const res = await fetch('/api/auth/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email }),
        });
        if (res.ok) {
          router.push('/dashboard');
          router.refresh();
          return;
        }
      } catch {
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : error.message
      );
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl overflow-hidden border border-white/20 bg-red-600">
              <img src="/logo.png" alt="TOI Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">THE TIMES OF INDIA</h1>
            <p className="text-sm text-slate-300 font-medium">Subscription & Circulation Portal</p>
            <p className="text-xs text-red-400 font-semibold mt-1">Main Admin: Umpathy</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ukss61925@gmail.com"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id="login-btn"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 flex justify-center">
            <InstallPwaButton className="w-full justify-center py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-all flex items-center gap-2" />
          </div>

          <p className="text-center text-xs text-slate-500 mt-5">
            Secured Admin Access • Times of India
          </p>
        </div>
      </div>
    </div>
  );
}
