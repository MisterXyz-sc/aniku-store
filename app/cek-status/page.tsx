'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, AlertCircle, Loader2, Search, Sparkles, Gem, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import type { TransactionItem, StatusKind } from '@/lib/types';

const STATUS_STYLE: Record<StatusKind, { badge: string; icon: typeof Clock }> = {
  pending: { badge: 'bg-ink-field text-paper-muted', icon: Clock },
  review: { badge: 'bg-gold/15 text-gold', icon: Eye },
  good: { badge: 'bg-good/15 text-good', icon: CheckCircle2 },
  bad: { badge: 'bg-bad/15 text-bad', icon: XCircle }
};

export default function CekStatusPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [items, setItems] = useState<TransactionItem[] | null>(null);
  const [searched, setSearched] = useState(false);

  const formatRupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');
  const formatTanggal = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/transactions?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal ngecek status, coba lagi.');
        setUsername(null);
        setItems(null);
        return;
      }
      setUsername(json.username ?? null);
      setItems(json.items ?? []);
    } catch {
      setError('Gagal menghubungi server, coba lagi.');
      setUsername(null);
      setItems(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <Link href="/" className="flex items-center gap-1 text-xs text-paper-muted w-fit hover:text-paper transition">
        <ChevronLeft size={14} strokeWidth={2.5} /> Kembali
      </Link>

      <div>
        <h1 className="font-display font-bold text-xl">Cek status transaksi</h1>
        <p className="mt-1 text-sm text-paper-muted">
          Masukin ID Aniku buat lihat transaksi terakhir kamu, atau ref. transaksi buat cek 1 transaksi spesifik.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-paper-muted">ID Aniku atau ref. transaksi</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="misal: 1409 atau ANK-1A2B3C-171..."
            className="flex-1 min-w-0 rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm font-mono outline-none transition focus:border-gold/60"
          />
          <button
            disabled={!query.trim() || loading}
            onClick={handleSearch}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gold text-ink font-bold px-4 text-sm transition hover:bg-gold-dark hover:text-paper disabled:opacity-40 shrink-0"
          >
            {loading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <Search size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-sm text-bad">
          <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {!error && searched && !loading && items && items.length === 0 && (
        <p className="text-sm text-paper-muted text-center py-6">Belum ada transaksi buat akun ini.</p>
      )}

      {!error && items && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {username && (
            <p className="text-xs text-paper-muted">
              Transaksi terakhir buat akun <span className="text-paper font-semibold">{username}</span>
            </p>
          )}

          {items.map((item) => {
            const style = STATUS_STYLE[item.status_kind];
            const StatusIcon = style.icon;
            const TypeIcon = item.type === 'premium' ? Sparkles : Gem;
            const iconWrapClass =
              item.type === 'premium' ? 'w-9 h-9 shrink-0 rounded-xl bg-gold/15 flex items-center justify-center' : 'w-9 h-9 shrink-0 rounded-xl bg-diamond/15 flex items-center justify-center';
            const iconClass = item.type === 'premium' ? 'text-gold' : 'text-diamond';

            return (
              <div key={item.merchant_ref} className="ticket overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                  <div className={iconWrapClass}>
                    <TypeIcon size={16} strokeWidth={2.25} className={iconClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.label}</p>
                    <p className="text-xs text-paper-muted mt-0.5">
                      {formatRupiah(item.amount)} · {formatTanggal(item.created_at)}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.badge}`}
                  >
                    <StatusIcon size={12} strokeWidth={2.5} />
                    {item.status_label}
                  </span>
                </div>

                <div className="ticket-divider" />

                <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-paper-muted">Ref. transaksi</span>
                    <span className="font-mono tabular text-paper text-right break-all">{item.merchant_ref}</span>
                  </div>
                  {item.manual_note && (
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-paper-muted shrink-0">Catatan kamu</span>
                      <span className="text-paper text-right break-words">{item.manual_note}</span>
                    </div>
                  )}
                  {item.is_manual && item.status_kind === 'review' && (
                    <p className="flex items-start gap-1.5 text-[11px] text-paper-muted mt-1">
                      <AlertCircle size={13} strokeWidth={2.25} className="shrink-0 mt-0.5" />
                      Bukti bayar udah masuk, tinggal nunggu admin review manual.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
