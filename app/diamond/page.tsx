'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, AlertCircle, Loader2, Download, Info } from 'lucide-react';
import type { CheckoutResponse } from '@/lib/types';

type Step = 'amount' | 'paying' | 'success';

const PRESETS = [5000, 20000, 50000];
const RUPIAH_PER_DIAMOND = 4; // Rp4 = 1 DM, samain kayak rasio di app

export default function DiamondPage() {
  const [amount, setAmount] = useState<number>(20000);
  const [userNumber, setUserNumber] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<CheckoutResponse | null>(null);
  const [topupRef, setTopupRef] = useState<string | null>(null);

  const estimatedDiamond = Math.floor(amount / RUPIAH_PER_DIAMOND);

  useEffect(() => {
    if (step !== 'paying' || !topupRef) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?type=diamond&id=${topupRef}`);
        const json = await res.json();
        if (json.status === 'credited') {
          setStep('success');
          clearInterval(interval);
        }
      } catch {
        // coba lagi interval berikutnya
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [step, topupRef]);

  async function handleDownloadQR() {
    if (!invoice?.qr) return;
    try {
      const res = await fetch(invoice.qr);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qris-aniku-${invoice.merchant_ref ?? 'diamond'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(invoice.qr, '_blank');
    }
  }

  async function handleSubmit() {
    if (!userNumber.trim() || amount < 500) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/diamond/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_number: userNumber.trim(), amount })
      });
      const json: CheckoutResponse = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal membuat pesanan, coba lagi.');
        setSubmitting(false);
        return;
      }
      setInvoice(json);
      setTopupRef(json.merchant_ref ?? null);
      setStep('paying');
    } catch {
      setError('Gagal menghubungi server, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  const formatRupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center text-center gap-4 pt-10 animate-rise-in">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-good/20 animate-ring-pulse" />
          <span className="absolute inset-0 rounded-full bg-good/20 animate-ring-pulse-delay" />
          <div className="relative w-16 h-16 rounded-full bg-good/15 flex items-center justify-center animate-pop-in">
            <CheckCircle2 size={30} strokeWidth={2} className="text-good" />
          </div>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">Pembayaran berhasil</h2>
          <p className="mt-1 text-sm text-paper-muted">
            {estimatedDiamond.toLocaleString('id-ID')} Diamond udah masuk ke akun{' '}
            <span className="font-semibold text-paper">{invoice?.username ?? `#${userNumber}`}</span>.
          </p>
        </div>
        <button
          onClick={() => {
            setStep('amount');
            setUserNumber('');
            setInvoice(null);
            setTopupRef(null);
          }}
          className="mt-2 rounded-full bg-diamond text-ink font-bold px-6 py-2.5 text-sm transition hover:bg-diamond-dark hover:text-paper"
        >
          Top-up lagi
        </button>
      </div>
    );
  }

  if (step === 'paying' && invoice) {
    return (
      <div className="flex flex-col gap-4 animate-rise-in">
        <h2 className="font-display font-bold text-lg">Scan QRIS buat bayar</h2>

        <div className="ticket overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <p className="text-xs text-paper-muted">
              {formatRupiah(amount)} · ≈ {estimatedDiamond.toLocaleString('id-ID')} Diamond untuk{' '}
              <span className="text-paper font-semibold">{invoice.username ?? `#${userNumber}`}</span>
            </p>

            {invoice.qr ? (
              <div className="bg-white rounded-2xl p-3 mx-auto mt-4 w-56 h-56 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={invoice.qr} alt="QRIS" className="w-full h-full object-contain" />
              </div>
            ) : (
              <p className="text-sm text-paper-muted text-center mt-4">QR gak tersedia buat metode ini.</p>
            )}
          </div>

          {invoice.qr && (
            <button
              onClick={handleDownloadQR}
              className="flex items-center justify-center gap-1.5 rounded-full border border-ink-line text-paper font-semibold py-2.5 text-xs mt-4 transition hover:border-diamond/60 hover:text-diamond"
            >
              <Download size={14} strokeWidth={2.5} /> Download QRIS
            </button>
          )}

          <div className="ticket-divider" />

          <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
            {invoice.merchant_ref && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-paper-muted">Ref. transaksi</span>
                <span className="font-mono tabular text-paper">{invoice.merchant_ref}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-line bg-ink-raised p-4">
          <p className="text-xs font-bold text-paper mb-2">Cara bayar</p>
          <ol className="flex flex-col gap-1.5 text-xs text-paper-muted list-decimal list-inside">
            <li>Buka app e-wallet atau m-banking kamu (Gopay, OVO, Dana, ShopeePay, dll).</li>
            <li>Pilih Scan QRIS, lalu arahkan kamera ke kode QR di atas (atau pakai QRIS yang di-download).</li>
            <li>Cek nominal <span className="text-paper font-semibold">{formatRupiah(amount)}</span> udah sesuai, lalu bayar.</li>
            <li>Tunggu beberapa detik, halaman ini otomatis update begitu pembayaran terverifikasi.</li>
          </ol>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-paper-muted">
          <Info size={14} strokeWidth={2.25} className="shrink-0 mt-0.5" />
          Halaman ini otomatis update begitu pembayaran terverifikasi, jangan tutup dulu. Kalau udah bayar tapi halaman ini gak berubah,
          coba buka lagi app Aniku-nya — biasanya Diamond udah nambah walau halaman ini belum ke-refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <Link href="/" className="flex items-center gap-1 text-xs text-paper-muted w-fit hover:text-paper transition">
        <ChevronLeft size={14} strokeWidth={2.5} /> Kembali
      </Link>

      <div>
        <h1 className="font-display font-bold text-xl">Top-up Diamond</h1>
        <p className="mt-1 text-sm text-paper-muted">Dipakai buat bikin &amp; kontribusi Clan.</p>
      </div>

      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
              amount === p
                ? 'border-diamond text-diamond bg-diamond/10'
                : 'border-ink-line text-paper-muted hover:border-ink-line hover:text-paper'
            }`}
          >
            Rp{(p / 1000).toFixed(0)}rb
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-paper-muted">Nominal (Rp)</label>
        <input
          type="number"
          value={amount}
          min={500}
          max={2000000}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm font-mono tabular outline-none transition focus:border-diamond/60"
        />
        <p className="mt-1.5 text-[11px] text-paper-muted">
          Min Rp500 · Max Rp2.000.000 · ≈ {estimatedDiamond.toLocaleString('id-ID')} Diamond
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
          className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm font-mono outline-none transition focus:border-diamond/60"
        />
        <p className="mt-1.5 text-[11px] text-paper-muted">
          ID ini ada di profil kamu di app Aniku (angka setelah tanda #).
        </p>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-sm text-bad">
          <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button
        disabled={!userNumber.trim() || amount < 500 || submitting}
        onClick={handleSubmit}
        className="flex items-center justify-center gap-2 rounded-full bg-diamond text-ink font-bold py-3.5 text-sm transition hover:bg-diamond-dark hover:text-paper disabled:opacity-40 disabled:hover:bg-diamond disabled:hover:text-ink"
      >
        {submitting && <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />}
        {submitting ? 'Memproses...' : 'Buat pesanan'}
      </button>

      <Link
        href="/diamond/manual"
        className="text-center text-xs text-paper-muted underline decoration-dotted underline-offset-4 hover:text-paper transition"
      >
        Bayar dari luar negeri (Malaysia, dll)?
      </Link>
    </div>
  );
}
