'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      <div className="flex flex-col items-center text-center gap-4 pt-10 animate-rise-in">
        <div className="w-16 h-16 rounded-full bg-good/15 flex items-center justify-center text-3xl">✅</div>
        <div>
          <h2 className="font-display font-bold text-lg">Pembayaran berhasil</h2>
          <p className="mt-1 text-sm text-paper-muted">
            Premium buat akun <span className="font-semibold text-paper">{invoice?.username ?? `#${userNumber}`}</span> udah aktif.
            Buka lagi app Aniku buat lihat perubahannya.
          </p>
        </div>
        <button
          onClick={() => {
            setStep('pick');
            setSelected(null);
            setUserNumber('');
            setInvoice(null);
            setClaimId(null);
          }}
          className="mt-2 rounded-full bg-gold text-ink font-bold px-6 py-2.5 text-sm transition hover:bg-gold-dark hover:text-paper"
        >
          Beli lagi
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
              {selected?.label} untuk <span className="text-paper font-semibold">{invoice.username ?? `#${userNumber}`}</span>{' '}
              · {formatRupiah(selected?.price ?? 0)}
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

          <div className="ticket-divider" />

          <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
            {invoice.merchant_ref && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-paper-muted">Ref. transaksi</span>
                <span className="font-mono tabular text-paper">{invoice.merchant_ref}</span>
              </div>
            )}
            {invoice.checkout_url && (
              <a
                href={invoice.checkout_url}
                target="_blank"
                rel="noreferrer"
                className="text-center rounded-full border border-ink-line py-2.5 text-sm font-semibold transition hover:border-gold/60 hover:text-gold"
              >
                Buka halaman pembayaran
              </a>
            )}
          </div>
        </div>

        <p className="text-xs text-paper-muted text-center">
          Halaman ini otomatis update begitu pembayaran terverifikasi. Jangan tutup dulu.
        </p>
      </div>
    );
  }

  if (step === 'user_number' && selected) {
    return (
      <div className="flex flex-col gap-5 animate-rise-in">
        <button onClick={() => setStep('pick')} className="text-xs text-paper-muted w-fit hover:text-paper transition">
          ‹ Kembali
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
          <p className="mt-1.5 text-[11px] text-paper-muted">
            ID ini ada di profil kamu di app Aniku (angka setelah tanda #), biar Premium-nya kekirim ke akun yang tepat.
          </p>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <button
          disabled={!userNumber.trim() || submitting}
          onClick={handleSubmitUserNumber}
          className="rounded-full bg-gold text-ink font-bold py-3.5 text-sm transition hover:bg-gold-dark hover:text-paper disabled:opacity-40 disabled:hover:bg-gold disabled:hover:text-ink"
        >
          {submitting ? 'Memproses...' : 'Buat pesanan'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <Link href="/" className="text-xs text-paper-muted w-fit hover:text-paper transition">
        ‹ Kembali
      </Link>

      <div>
        <h1 className="font-display font-bold text-xl">Aniku Premium</h1>
        <p className="mt-1 text-sm text-paper-muted">Pilih paket, isi ID Aniku, bayar QRIS.</p>
      </div>

      {loadingPackages && <p className="text-sm text-paper-muted">Memuat paket...</p>}

      <div className="flex flex-col gap-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="foil-card rounded-2xl border border-ink-line bg-gradient-to-br from-[#2A2016] via-ink-raised to-ink-raised p-4 shadow-card"
          >
            <div className="relative z-[2] flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-bold text-base">{pkg.label}</p>
                <p className="text-xs text-paper-muted mt-0.5">{pkg.duration_days} hari premium</p>
                {!!pkg.bonus_diamond && (
                  <p className="text-xs text-good font-semibold mt-1.5">
                    ✨ Bonus {pkg.bonus_diamond} Diamond
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
              className="relative z-[2] mt-3 w-full rounded-full border border-gold/50 text-gold font-bold py-2.5 text-sm transition hover:bg-gold hover:text-ink"
            >
              Pilih paket
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
