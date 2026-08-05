'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, AlertCircle, Loader2, Sparkles, Gem, CheckCircle2 } from 'lucide-react';
import type { HistoryItem } from '@/lib/types';

export default function RiwayatPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  const formatRupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');
  const formatTanggal = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/history');
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok || json.error) {
          setError(json.error || 'Gagal ambil riwayat transaksi.');
          setItems(null);
          return;
        }
        setItems(json.items ?? []);
      } catch {
        if (mounted) {
          setError('Gagal menghubungi server, coba lagi.');
          setItems(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <Link href="/" className="flex items-center gap-1 text-xs text-paper-muted w-fit hover:text-paper transition">
        <ChevronLeft size={14} strokeWidth={2.5} /> Kembali
      </Link>

      <div>
        <h1 className="font-display font-bold text-xl">Riwayat transaksi berhasil</h1>
        <p className="mt-1 text-sm text-paper-muted">Transaksi Premium &amp; Diamond terbaru dari semua user, manual maupun otomatis.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-paper-muted py-10">
          <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> Memuat...
        </div>
      )}

      {!loading && error && (
        <p className="flex items-start gap-1.5 text-sm text-bad">
          <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {!loading && !error && items && items.length === 0 && (
        <p className="text-sm text-paper-muted text-center py-10">Belum ada transaksi berhasil.</p>
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item, i) => {
            const TypeIcon = item.type === 'premium' ? Sparkles : Gem;
            const iconWrapClass =
              item.type === 'premium' ? 'w-9 h-9 shrink-0 rounded-xl bg-gold/15 flex items-center justify-center' : 'w-9 h-9 shrink-0 rounded-xl bg-diamond/15 flex items-center justify-center';
            const iconClass = item.type === 'premium' ? 'text-gold' : 'text-diamond';

            return (
              <div key={`${item.username}-${item.created_at}-${i}`} className="ticket overflow-hidden">
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className={iconWrapClass}>
                    <TypeIcon size={16} strokeWidth={2.25} className={iconClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      <span className="text-paper">{item.username}</span> <span className="text-paper-muted">— {item.label}</span>
                    </p>
                    <p className="text-xs text-paper-muted mt-0.5">
                      {formatRupiah(item.amount)} · {formatTanggal(item.created_at)}
                    </p>
                  </div>
                  <CheckCircle2 size={16} strokeWidth={2.25} className="text-good shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
