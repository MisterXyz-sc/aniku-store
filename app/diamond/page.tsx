'use client';

import { useEffect, useState } from 'react';
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
      <div className="flex flex-col items-center text-center gap-4 pt-10">
        <div className="text-5xl">✅</div>
        <h2 className="text-lg font-bold">Pembayaran Berhasil!</h2>
        <p className="text-sm text-white/60">
          {estimatedDiamond} Diamond udah masuk ke akun{' '}
          <span className="font-semibold text-white">{invoice?.username ?? `#${userNumber}`}</span>.
        </p>
        <button
          onClick={() => {
            setStep('amount');
            setUserNumber('');
            setInvoice(null);
            setTopupRef(null);
          }}
          className="mt-2 rounded-full bg-sky-400 text-black font-semibold px-6 py-2 text-sm"
        >
          Top-up Lagi
        </button>
      </div>
    );
  }

  if (step === 'paying' && invoice) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Scan QRIS Buat Bayar</h2>
        <p className="text-sm text-white/60">
          {formatRupiah(amount)} · sekitar {estimatedDiamond} Diamond untuk{' '}
          <span className="text-white font-semibold">{invoice.username ?? `#${userNumber}`}</span>
        </p>

        {invoice.qr ? (
          <div className="bg-white rounded-2xl p-3 mx-auto w-64 h-64 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={invoice.qr} alt="QRIS" className="w-full h-full object-contain" />
          </div>
        ) : (
          <p className="text-sm text-white/50 text-center">QR gak tersedia buat metode ini.</p>
        )}

        {invoice.checkout_url && (
          <a
            href={invoice.checkout_url}
            target="_blank"
            rel="noreferrer"
            className="text-center rounded-full border border-aniku-border py-2.5 text-sm font-semibold"
          >
            Buka Halaman Pembayaran
          </a>
        )}

        <p className="text-xs text-white/40 text-center">
          Halaman ini otomatis update begitu pembayaran terverifikasi. Jangan tutup dulu.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Top-up Diamond</h1>
      <p className="text-sm text-white/50">Dipakai buat bikin & kontribusi Clan.</p>

      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
              amount === p
                ? 'border-sky-400 text-sky-400 bg-sky-400/10'
                : 'border-aniku-border text-white/60'
            }`}
          >
            Rp{(p / 1000).toFixed(0)}rb
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-white/50">Nominal (Rp)</label>
        <input
          type="number"
          value={amount}
          min={500}
          max={2000000}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-xl bg-aniku-card border border-aniku-border px-4 py-3 text-sm outline-none focus:border-sky-400/60"
        />
        <p className="mt-1 text-[11px] text-white/40">
          Min Rp500 · Max Rp2.000.000 · ≈ {estimatedDiamond.toLocaleString('id-ID')} Diamond
        </p>
      </div>

      <div>
        <label className="text-xs text-white/50">ID Aniku kamu</label>
        <input
          type="number"
          inputMode="numeric"
          value={userNumber}
          onChange={(e) => setUserNumber(e.target.value)}
          placeholder="misal: 1409"
          className="mt-1 w-full rounded-xl bg-aniku-card border border-aniku-border px-4 py-3 text-sm outline-none focus:border-sky-400/60"
        />
        <p className="mt-1 text-[11px] text-white/40">
          ID ini ada di profil kamu di app Aniku (angka setelah tanda #).
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        disabled={!userNumber.trim() || amount < 500 || submitting}
        onClick={handleSubmit}
        className="rounded-full bg-sky-400 text-black font-semibold py-3 text-sm disabled:opacity-40"
      >
        {submitting ? 'Memproses...' : 'Buat Pesanan'}
      </button>
    </div>
  );
}
