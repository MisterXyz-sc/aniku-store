'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabasePublic } from '@/lib/supabasePublic';

// Login pake akun Aniku yang udah ada (Supabase Auth), BUKAN sistem admin
// baru. Server (API route) yang cek profiles.is_admin buat akun ini.
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    const { error: authErr } = await supabasePublic.auth.signInWithPassword({ email, password });
    if (authErr) {
      setError('Email atau password salah.');
      setSubmitting(false);
      return;
    }

    // Pastiin akun ini beneran admin sebelum masuk ke dashboard.
    const {
      data: { session }
    } = await supabasePublic.auth.getSession();
    const res = await fetch('/api/admin/manual-payments', {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
    });
    if (res.status === 403) {
      await supabasePublic.auth.signOut();
      setError('Akun ini login berhasil, tapi bukan akun admin.');
      setSubmitting(false);
      return;
    }

    router.push('/admin/manual-payments');
  }

  return (
    <div className="flex flex-col gap-5 pt-6 animate-rise-in">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} strokeWidth={2.25} className="text-brand" />
        <h1 className="font-display font-bold text-xl">Login Admin</h1>
      </div>
      <p className="text-sm text-paper-muted -mt-3">Pakai akun admin Aniku yang sama kayak di app.</p>

      <div>
        <label className="text-xs text-paper-muted">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm outline-none transition focus:border-brand/60"
        />
      </div>
      <div>
        <label className="text-xs text-paper-muted">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm outline-none transition focus:border-brand/60"
        />
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-sm text-bad">
          <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button
        disabled={!email || !password || submitting}
        onClick={handleLogin}
        className="flex items-center justify-center gap-2 rounded-full bg-brand text-ink font-bold py-3.5 text-sm transition hover:bg-brand/90 disabled:opacity-40"
      >
        {submitting && <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />}
        {submitting ? 'Masuk...' : 'Login'}
      </button>
    </div>
  );
}
