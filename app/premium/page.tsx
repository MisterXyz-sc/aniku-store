'use client';

import { useEffect, useState } from 'react';
import { supabasePublic } from '@/lib/supabasePublic';
import type { PremiumPackage, CheckoutResponse } from '@/lib/types';

type Step = 'pick' | 'user_number' | 'paying' | 'success';

export default function PremiumPage() {
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selected, setSelected] = useState<PremiumPackage | null>(null);
  const [userNumber, setUserNumber] = useState('');
  const [step, setStep] = useState<Step>('pick');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<CheckoutResponse | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);

  useEffect(() => {
    supabasePublic
      .from('premium_packages')
      .select('*')
      .eq('is_active', true)
      .order('duration_days', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setPackages(data as PremiumPackage[]);
        setLoadingPackages(false);
      });
  }, []);

  // Polling status pembayaran tiap 4 detik selagi di step "paying"
  useEffect(() => {
    if (step !== 'paying' || !claimId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?type=premium&id=${claimId}`);
        const json = await res.json();
        if (json.status === 'ready' || json.status === 'claimed') {
          setStep('success');
          clearInterval(interval);
        }
      } catch {
        // biarin, coba lagi di interval berikutnya
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [step, claimId]);

  const formatRupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');

  async function handleSubmitUserNumber() {
    if (!selected || !userNumber.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/premium/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_number: userNumber.trim(), package_id: selected.id })
      });
      const json: CheckoutResponse = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal membuat pesanan, coba lagi.');
        setSubmitting(false);
        return;
      }
      setInvoice(json);
      setClaimId(json.claim_id ?? null);
      setStep('paying');
    } catch (e) {
      setError('Gagal menghubungi server, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center text-center gap-4 pt-10">
        <div className="text-5xl">✅</div>
        <h2 className="text-lg font-bold">Pembayaran Berhasil!</h2>
        <p className="text-sm text-white/60">
          Premium buat akun <span className="font-semibold text-white">{invoice?.username ?? `#${userNumber}`}</span> udah aktif.
          Buka lagi app Aniku buat lihat perubahannya.
        </p>
        <button
          onClick={() => {
            setStep('pick');
            setSelected(null);
            setUserNumber('');
            setInvoice(null);
            setClaimId(null);
          }}
          className="mt-2 rounded-full bg-aniku-gold text-black font-semibold px-6 py-2 text-sm"
        >
          Beli Lagi
        </button>
      </div>
    );
  }

  if (step === 'paying' && invoice) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Scan QRIS Buat Bayar</h2>
        <p className="text-sm text-white/60">
          {selected?.label} untuk <span className="text-white font-semibold">{invoice.username ?? `#${userNumber}`}</span> —{' '}
          {formatRupiah(selected?.price ?? 0)}
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

  if (step === 'user_number' && selected) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => setStep('pick')} className="text-sm text-white/50 text-left">
          ‹ Kembali
        </button>
        <h2 className="text-lg font-bold">{selected.label}</h2>
        <p className="text-sm text-white/60">
          {selected.duration_days} hari premium · {formatRupiah(selected.price)}
          {!!selected.bonus_diamond && (
            <span className="text-emerald-400"> · Bonus {selected.bonus_diamond} Diamond</span>
          )}
        </p>

        <div>
          <label className="text-xs text-white/50">ID Aniku kamu</label>
          <input
            type="number"
            inputMode="numeric"
            value={userNumber}
            onChange={(e) => setUserNumber(e.target.value)}
            placeholder="misal: 1409"
            className="mt-1 w-full rounded-xl bg-aniku-card border border-aniku-border px-4 py-3 text-sm outline-none focus:border-aniku-gold/60"
          />
          <p className="mt-1 text-[11px] text-white/40">
            ID ini ada di profil kamu di app Aniku (angka setelah tanda #), biar Premium-nya kekirim ke akun yang tepat.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          disabled={!userNumber.trim() || submitting}
          onClick={handleSubmitUserNumber}
          className="rounded-full bg-aniku-gold text-black font-semibold py-3 text-sm disabled:opacity-40"
        >
          {submitting ? 'Memproses...' : 'Buat Pesanan'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Aniku Premium</h1>
      <p className="text-sm text-white/50">Pilih paket, isi ID Aniku, bayar QRIS.</p>

      {loadingPackages && <p className="text-sm text-white/40">Memuat paket...</p>}

      {packages.map((pkg) => (
        <div key={pkg.id} className="rounded-2xl border border-aniku-border bg-aniku-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">{pkg.label}</p>
              <p className="text-xs text-white/50">{pkg.duration_days} hari premium</p>
              {!!pkg.bonus_diamond && (
                <p className="text-xs text-emerald-400 font-semibold mt-1">
                  ✨ Bonus Diamond: {pkg.bonus_diamond}
                </p>
              )}
            </div>
            <p className="font-bold text-sky-400">{formatRupiah(pkg.price)}</p>
          </div>
          <button
            onClick={() => {
              setSelected(pkg);
              setStep('user_number');
            }}
            className="mt-3 w-full rounded-full border border-aniku-gold/60 text-aniku-gold font-semibold py-2 text-sm"
          >
            Pilih Paket
          </button>
        </div>
      ))}
    </div>
  );
}
