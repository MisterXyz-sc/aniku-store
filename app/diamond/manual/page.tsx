'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, AlertCircle, Loader2, Info, Upload, Clock, Download, Copy, Check } from 'lucide-react';
import type { ManualCheckoutResponse } from '@/lib/types';
import { buildResumeCode } from '@/lib/resumeCode';
import { savePendingOrder, removePendingOrder } from '@/lib/pendingOrders';

type Step = 'amount' | 'proof' | 'waiting' | 'success';

const PRESETS = [5000, 20000, 50000];
const RUPIAH_PER_DIAMOND = 4;

export default function DiamondManualPage() {
  const [amount, setAmount] = useState<number>(20000);
  const [userNumber, setUserNumber] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<ManualCheckoutResponse | null>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  const estimatedDiamond = Math.floor(amount / RUPIAH_PER_DIAMOND);

  useEffect(() => {
    if (step !== 'waiting' || !order?.merchant_ref) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?type=diamond&id=${order.merchant_ref}`);
        const json = await res.json();
        if (json.status === 'credited') {
          setStep('success');
          if (order.merchant_ref && order.proof_token) {
            removePendingOrder(buildResumeCode({ type: 'diamond', id: order.merchant_ref, token: order.proof_token }));
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
      a.download = `qris-aniku-${order?.merchant_ref ?? 'diamond'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open('/manual-qris-qr.png', '_blank');
    }
  }

  async function handleCreateOrder() {
    if (!userNumber.trim() || amount < 500) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/diamond/manual-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_number: userNumber.trim(), amount })
      });
      const json: ManualCheckoutResponse = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal membuat pesanan, coba lagi.');
        setSubmitting(false);
        return;
      }
      setOrder(json);
      setStep('proof');
      if (json.merchant_ref && json.proof_token) {
        savePendingOrder({
          resumeCode: buildResumeCode({ type: 'diamond', id: json.merchant_ref, token: json.proof_token }),
          type: 'diamond',
          label: `Top-up ${(json.diamond_amount ?? estimatedDiamond).toLocaleString('id-ID')} Diamond`,
          amount: json.amount ?? amount,
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
    if (!order?.merchant_ref || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('type', 'diamond');
      form.set('id', order.merchant_ref);
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
            {(order?.diamond_amount ?? estimatedDiamond).toLocaleString('id-ID')} Diamond udah masuk ke akun{' '}
            <span className="font-semibold text-paper">{order?.username ?? `#${userNumber}`}</span>.
          </p>
        </div>
        <Link
          href="/diamond/manual"
          onClick={() => {
            setStep('amount');
            setUserNumber('');
            setOrder(null);
            setFile(null);
            setNote('');
          }}
          className="mt-2 rounded-full bg-diamond text-ink font-bold px-6 py-2.5 text-sm transition hover:bg-diamond-dark hover:text-paper"
        >
          Top-up lagi
        </Link>
      </div>
    );
  }

  if (step === 'waiting') {
    return (
      <div className="flex flex-col items-center text-center gap-4 pt-10 animate-rise-in">
        <div className="w-16 h-16 rounded-full bg-diamond/15 flex items-center justify-center">
          <Clock size={28} strokeWidth={2} className="text-diamond" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">Menunggu verifikasi</h2>
          <p className="mt-1 text-sm text-paper-muted">
            Bukti bayar kamu lagi dicek manual sama admin. Halaman ini otomatis update begitu udah dikonfirmasi.
          </p>
        </div>
        {order?.merchant_ref && <p className="font-mono text-xs text-paper-muted">Ref: {order.merchant_ref}</p>}
        <p className="text-[11px] text-paper-muted max-w-xs">
          Nutup halaman ini gapapa -- kode lanjutan yang tadi udah disimpen di{' '}
          <Link href="/lanjutkan" className="text-diamond underline">
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
              {formatRupiah(order.amount ?? 0)} · ≈ {(order.diamond_amount ?? 0).toLocaleString('id-ID')} Diamond untuk{' '}
              <span className="text-paper font-semibold">{order.username ?? `#${userNumber}`}</span>
            </p>
            <div className="bg-white rounded-2xl p-3 mx-auto mt-4 w-full max-w-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/manual-qris-qr.png" alt="QRIS" className="w-full h-auto" />
            </div>
          </div>

          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-1.5 rounded-full border border-ink-line text-paper font-semibold py-2.5 text-xs mt-4 mx-5 transition hover:border-diamond/60 hover:text-diamond"
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
            {order.proof_token && order.merchant_ref && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-paper-muted">Kode lanjutan (simpen kalau belum sempet kirim bukti)</span>
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 font-mono text-[10px] text-paper bg-ink-field rounded-lg px-2.5 py-2 break-all">
                    {buildResumeCode({ type: 'diamond', id: order.merchant_ref, token: order.proof_token })}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          buildResumeCode({ type: 'diamond', id: order.merchant_ref as string, token: order.proof_token as string })
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        // clipboard gak diizinin -- gapapa, kodenya udah keliatan, bisa diseleksi manual
                      }
                    }}
                    className="flex items-center justify-center gap-1 shrink-0 rounded-lg border border-ink-line px-2.5 py-2 text-[11px] font-semibold text-paper-muted transition hover:border-diamond/60 hover:text-diamond"
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
            className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm outline-none transition focus:border-diamond/60"
          />
        </div>

        <div>
          <label className="text-xs text-paper-muted">Screenshot bukti bayar</label>
          <label className="mt-1.5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-line py-6 text-sm text-paper-muted cursor-pointer transition hover:border-diamond/60 hover:text-paper">
            <Upload size={16} strokeWidth={2.25} />
            {file ? file.name : 'Pilih gambar'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
          className="flex items-center justify-center gap-2 rounded-full bg-diamond text-ink font-bold py-3.5 text-sm transition hover:bg-diamond-dark hover:text-paper disabled:opacity-40"
        >
          {submitting && <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />}
          {submitting ? 'Mengirim...' : 'Kirim bukti bayar'}
        </button>

        <p className="flex items-start gap-1.5 text-xs text-paper-muted">
          <Info size={14} strokeWidth={2.25} className="shrink-0 mt-0.5" />
          Karena ini pembayaran manual, Diamond gak masuk otomatis kayak QRIS biasa — perlu direview admin dulu.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <Link href="/diamond" className="flex items-center gap-1 text-xs text-paper-muted w-fit hover:text-paper transition">
        <ChevronLeft size={14} strokeWidth={2.5} /> Kembali
      </Link>

      <div>
        <h1 className="font-display font-bold text-xl">Diamond — Bayar dari luar negeri</h1>
        <p className="mt-1 text-sm text-paper-muted">
          Buat pembeli yang e-wallet-nya (misal Malaysia) gak kebaca QRIS otomatis. Pembayaran direview manual admin.
        </p>
      </div>

      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
              amount === p ? 'border-diamond text-diamond bg-diamond/10' : 'border-ink-line text-paper-muted hover:text-paper'
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
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-sm text-bad">
          <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button
        disabled={!userNumber.trim() || amount < 500 || submitting}
        onClick={handleCreateOrder}
        className="flex items-center justify-center gap-2 rounded-full bg-diamond text-ink font-bold py-3.5 text-sm transition hover:bg-diamond-dark hover:text-paper disabled:opacity-40"
      >
        {submitting && <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />}
        {submitting ? 'Memproses...' : 'Lanjut ke pembayaran'}
      </button>
    </div>
  );
}
