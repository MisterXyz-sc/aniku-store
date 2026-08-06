'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, AlertCircle, Loader2, Info, Upload, Clock, Download, Copy, Check, Sparkles } from 'lucide-react';
import { supabasePublic } from '@/lib/supabasePublic';
import type { PremiumPackage, ManualCheckoutResponse } from '@/lib/types';
import { buildResumeCode } from '@/lib/resumeCode';
import { savePendingOrder, removePendingOrder } from '@/lib/pendingOrders';

type Step = 'pick' | 'user_number' | 'proof' | 'waiting' | 'success';

export default function PremiumManualPage() {
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const [selected, setSelected] = useState<PremiumPackage | null>(null);
  const [userNumber, setUserNumber] = useState('');
  const [step, setStep] = useState<Step>('pick');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<ManualCheckoutResponse | null>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabasePublic
      .from('premium_packages')
      .select('*')
      .eq('is_active', true)
      .order('duration_days', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setPackages(data as PremiumPackage[]);
      });
  }, []);

  // Polling status -- endpoint & logic-nya SAMA kayak flow Sakurupiah biasa,
  // cuma "berhasil"-nya dipicu admin approve manual, bukan webhook.
  useEffect(() => {
    if (step !== 'waiting' || !order?.claim_id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?type=premium&id=${order.claim_id}`);
        const json = await res.json();
        if (json.status === 'ready' || json.status === 'claimed') {
          setStep('success');
          if (order.claim_id && order.proof_token) {
            removePendingOrder(buildResumeCode({ type: 'premium', id: order.claim_id, token: order.proof_token }));
          }
          clearInterval(interval);
        }
      } catch {
        // coba lagi interval berikutnya
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, order]);

  const formatRupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');

  async function handleDownloadQR() {
    try {
      const res = await fetch('/manual-qris-qr.png');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qris-aniku-${order?.merchant_ref ?? 'premium'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open('/manual-qris-qr.png', '_blank');
    }
  }

  async function handleCreateOrder() {
    if (!selected || !userNumber.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/premium/manual-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_number: userNumber.trim(), package_id: selected.id })
      });
      const json: ManualCheckoutResponse = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal membuat pesanan, coba lagi.');
        setSubmitting(false);
        return;
      }
      setOrder(json);
      setStep('proof');
      if (json.claim_id && json.proof_token) {
        savePendingOrder({
          resumeCode: buildResumeCode({ type: 'premium', id: json.claim_id, token: json.proof_token }),
          type: 'premium',
          label: selected.label,
          amount: json.amount ?? selected.price,
          username: json.username,
          created_at: new Date().toISOString()
        });
      }
    } catch {
      setError('Gagal menghubungi server, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitProof() {
    if (!order?.claim_id || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('type', 'premium');
      form.set('id', order.claim_id);
      form.set('token', order.proof_token ?? '');
      form.set('note', note);
      form.set('file', file);
      const res = await fetch('/api/manual-proof', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal upload bukti bayar, coba lagi.');
        setSubmitting(false);
        return;
      }
      setStep('waiting');
    } catch {
      setError('Gagal menghubungi server, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center text-center gap-4 pt-10 animate-rise-in">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-good/20 animate-ring-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-good/15 flex items-center justify-center animate-pop-in">
            <CheckCircle2 size={30} strokeWidth={2} className="text-good" />
          </div>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">Pembayaran dikonfirmasi</h2>
          <p className="mt-1 text-sm text-paper-muted">
            Premium buat akun <span className="font-semibold text-paper">{order?.username ?? `#${userNumber}`}</span> udah aktif.
            Buka lagi app Aniku buat lihat perubahannya.
          </p>
        </div>
        <Link
          href="/premium/manual"
          onClick={() => {
            setStep('pick');
            setSelected(null);
            setUserNumber('');
            setOrder(null);
            setFile(null);
            setNote('');
          }}
          className="mt-2 rounded-full bg-gold text-ink font-bold px-6 py-2.5 text-sm transition hover:bg-gold-dark hover:text-paper"
        >
          Beli lagi
        </Link>
      </div>
    );
  }

  if (step === 'waiting') {
    return (
      <div className="flex flex-col items-center text-center gap-4 pt-10 animate-rise-in">
        <div className="w-16 h-16 rounded-full bg-gold/15 flex items-center justify-center">
          <Clock size={28} strokeWidth={2} className="text-gold" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">Menunggu verifikasi</h2>
          <p className="mt-1 text-sm text-paper-muted">
            Bukti bayar kamu udah dikirim dan lagi dicek manual sama admin. Biasanya gak lama — halaman ini otomatis update begitu
            udah dikonfirmasi, jangan tutup dulu.
          </p>
        </div>
        {order?.merchant_ref && (
          <p className="font-mono text-xs text-paper-muted">Ref: {order.merchant_ref}</p>
        )}
        <p className="text-[11px] text-paper-muted max-w-xs">
          Nutup halaman ini gapapa -- kode lanjutan yang tadi udah disimpen di{' '}
          <Link href="/lanjutkan" className="text-gold underline">
            /lanjutkan
          </Link>{' '}
          buat cek lagi nanti.
        </p>
      </div>
    );
  }

  if (step === 'proof' && order) {
    return (
      <div className="flex flex-col gap-5 animate-rise-in">
        <h2 className="font-display font-bold text-lg">Scan QRIS &amp; kirim bukti bayar</h2>

        <div className="ticket overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <p className="text-xs text-paper-muted">
              {selected?.label} untuk <span className="text-paper font-semibold">{order.username ?? `#${userNumber}`}</span> ·{' '}
              {formatRupiah(order.amount ?? 0)}
            </p>
            <div className="bg-white rounded-2xl p-3 mx-auto mt-4 w-full max-w-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/manual-qris-qr.png" alt="QRIS" className="w-full h-auto" />
            </div>
          </div>

          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-1.5 rounded-full border border-ink-line text-paper font-semibold py-2.5 text-xs mt-4 mx-5 transition hover:border-gold/60 hover:text-gold"
          >
            <Download size={14} strokeWidth={2.5} /> Download QRIS
          </button>
          <div className="ticket-divider" />
          <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
            {order.merchant_ref && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-paper-muted">Ref. transaksi</span>
                <span className="font-mono tabular text-paper">{order.merchant_ref}</span>
              </div>
            )}
            {order.proof_token && order.claim_id && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-paper-muted">Kode lanjutan (simpen kalau belum sempet kirim bukti)</span>
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 font-mono text-[10px] text-paper bg-ink-field rounded-lg px-2.5 py-2 break-all">
                    {buildResumeCode({ type: 'premium', id: order.claim_id, token: order.proof_token })}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          buildResumeCode({ type: 'premium', id: order.claim_id as string, token: order.proof_token as string })
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        // clipboard gak diizinin -- gapapa, kodenya udah keliatan, bisa diseleksi manual
                      }
                    }}
                    className="flex items-center justify-center gap-1 shrink-0 rounded-lg border border-ink-line px-2.5 py-2 text-[11px] font-semibold text-paper-muted transition hover:border-gold/60 hover:text-gold"
                  >
                    {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2.5} />}
                    {copied ? 'Kesalin' : 'Salin'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-paper-muted">Catatan / no. referensi transaksi (opsional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="misal: TnG ref #123456"
            className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm outline-none transition focus:border-gold/60"
          />
        </div>

        <div>
          <label className="text-xs text-paper-muted">Screenshot bukti bayar</label>
          <label className="mt-1.5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-line py-6 text-sm text-paper-muted cursor-pointer transition hover:border-gold/60 hover:text-paper">
            <Upload size={16} strokeWidth={2.25} />
            {file ? file.name : 'Pilih gambar'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-bad">
            <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <button
          disabled={!file || submitting}
          onClick={handleSubmitProof}
          className="flex items-center justify-center gap-2 rounded-full bg-gold text-ink font-bold py-3.5 text-sm transition hover:bg-gold-dark hover:text-paper disabled:opacity-40"
        >
          {submitting && <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />}
          {submitting ? 'Mengirim...' : 'Kirim bukti bayar'}
        </button>

        <p className="flex items-start gap-1.5 text-xs text-paper-muted">
          <Info size={14} strokeWidth={2.25} className="shrink-0 mt-0.5" />
          Karena ini pembayaran manual (buat pembeli luar negeri), Premium gak masuk otomatis kayak QRIS biasa — perlu direview
          admin dulu.
        </p>
      </div>
    );
  }

  if (step === 'user_number' && selected) {
    return (
      <div className="flex flex-col gap-5 animate-rise-in">
        <button
          onClick={() => setStep('pick')}
          className="flex items-center gap-1 text-xs text-paper-muted w-fit hover:text-paper transition"
        >
          <ChevronLeft size={14} strokeWidth={2.5} /> Kembali
        </button>

        <div className="rounded-2xl border border-ink-line bg-ink-raised p-4">
          <p className="font-display font-bold text-base">{selected.label}</p>
          <p className="mt-1 text-xs text-paper-muted">
            {selected.duration_days} hari premium · <span className="text-paper font-semibold">{formatRupiah(selected.price)}</span>
            {!!selected.bonus_diamond && (
              <span className="text-good"> · Bonus {selected.bonus_diamond} Diamond</span>
            )}
          </p>
        </div>

        <div>
          <label className="text-xs text-paper-muted">ID Aniku kamu</label>
          <input
            type="number"
            inputMode="numeric"
            value={userNumber}
            onChange={(e) => setUserNumber(e.target.value)}
            placeholder="misal: 1409"
            className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm font-mono outline-none transition focus:border-gold/60"
          />
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-bad">
            <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <button
          disabled={!userNumber.trim() || submitting}
          onClick={handleCreateOrder}
          className="flex items-center justify-center gap-2 rounded-full bg-gold text-ink font-bold py-3.5 text-sm transition hover:bg-gold-dark hover:text-paper disabled:opacity-40"
        >
          {submitting && <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />}
          {submitting ? 'Memproses...' : 'Lanjut ke pembayaran'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <Link href="/premium" className="flex items-center gap-1 text-xs text-paper-muted w-fit hover:text-paper transition">
        <ChevronLeft size={14} strokeWidth={2.5} /> Kembali
      </Link>

      <div>
        <h1 className="font-display font-bold text-xl">Premium — Bayar dari luar negeri</h1>
        <p className="mt-1 text-sm text-paper-muted">
          Buat pembeli yang e-wallet-nya (misal Malaysia) gak kebaca QRIS otomatis. Pembayaran direview manual admin.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="rounded-2xl border border-ink-line bg-ink-raised p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-bold text-base">{pkg.label}</p>
                <p className="text-xs text-paper-muted mt-0.5">{pkg.duration_days} hari premium</p>
                {!!pkg.bonus_diamond && (
                  <p className="flex items-center gap-1 text-xs text-good font-semibold mt-1.5">
                    <Sparkles size={12} strokeWidth={2.5} /> Bonus {pkg.bonus_diamond} Diamond
                  </p>
                )}
              </div>
              <p className="font-mono font-semibold text-gold shrink-0">{formatRupiah(pkg.price)}</p>
            </div>
            <button
              onClick={() => {
                setSelected(pkg);
                setStep('user_number');
              }}
              className="mt-3 w-full rounded-full border border-gold/50 text-gold font-bold py-2.5 text-sm transition hover:bg-gold hover:text-ink"
            >
              Pilih paket
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
