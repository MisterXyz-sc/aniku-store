'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, LogOut, Inbox } from 'lucide-react';
import { supabasePublic } from '@/lib/supabasePublic';
import type { ManualPaymentItem } from '@/lib/types';

export default function ManualPaymentsAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<ManualPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { session }
    } = await supabasePublic.auth.getSession();

    if (!session) {
      router.push('/admin/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/manual-payments', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      setItems(json.items ?? []);
    } catch {
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(item: ManualPaymentItem, action: 'approve' | 'reject') {
    const key = `${item.type}-${item.id}`;
    setBusyKey(key);
    setError(null);
    try {
      const {
        data: { session }
      } = await supabasePublic.auth.getSession();
      const res = await fetch('/api/admin/manual-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ type: item.type, id: item.id, action })
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal memproses.');
        setBusyKey(null);
        return;
      }
      setItems((prev) => prev.filter((i) => !(i.type === item.type && i.id === item.id)));
    } catch {
      setError('Gagal menghubungi server.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleLogout() {
    await supabasePublic.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} strokeWidth={2.25} className="text-brand" />
          <h1 className="font-display font-bold text-xl">Manual Payments</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-paper-muted hover:text-paper transition">
          <LogOut size={14} strokeWidth={2.25} /> Keluar
        </button>
      </div>

      {loading && <p className="text-sm text-paper-muted">Memuat...</p>}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 text-center pt-10 text-paper-muted">
          <Inbox size={28} strokeWidth={2} />
          <p className="text-sm">Gak ada pembayaran manual yang nunggu direview.</p>
        </div>
      )}

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const key = `${item.type}-${item.id}`;
          const busy = busyKey === key;
          return (
            <div key={key} className="rounded-2xl border border-ink-line bg-ink-raised p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-paper-muted mt-0.5">
                    {item.username} · Rp{item.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="font-mono text-[11px] text-paper-muted mt-1">{item.merchant_ref}</p>
                </div>
                <span className="text-[10px] font-bold tracking-wide text-gold bg-gold/10 rounded-full px-2 py-1 shrink-0 uppercase">
                  {item.type}
                </span>
              </div>

              {item.manual_note && (
                <p className="text-xs text-paper-muted rounded-lg bg-ink-field px-3 py-2">Catatan: {item.manual_note}</p>
              )}

              {item.manual_proof_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.manual_proof_url}
                  alt="Bukti bayar"
                  className="w-full max-h-72 object-contain rounded-xl border border-ink-line bg-black/20"
                />
              )}

              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => handleAction(item, 'approve')}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-good/15 text-good font-bold py-2.5 text-xs transition hover:bg-good/25 disabled:opacity-40"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} strokeWidth={2.5} />}
                  Approve
                </button>
                <button
                  disabled={busy}
                  onClick={() => handleAction(item, 'reject')}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-bad/15 text-bad font-bold py-2.5 text-xs transition hover:bg-bad/25 disabled:opacity-40"
                >
                  <XCircle size={14} strokeWidth={2.5} /> Tolak
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
