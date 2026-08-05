'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  AlertCircle,
  Loader2,
  Search,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Gem,
  Download
} from 'lucide-react';
import { buildResumeCode, parseResumeCode, type ResumePayload } from '@/lib/resumeCode';
import { loadPendingOrders, removePendingOrder, type PendingOrder } from '@/lib/pendingOrders';

type Stage = 'input' | 'form' | 'waiting' | 'done' | 'closed';

export default function LanjutkanPage() {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<ResumePayload | null>(null);
  const [savedOrders, setSavedOrders] = useState<PendingOrder[]>([]);
  const [stage, setStage] = useState<Stage>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSavedOrders(loadPendingOrders());
  }, []);

  const formatRupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');

  async function handleLookup(rawCode: string) {
    const parsed = parseResumeCode(rawCode);
    if (!parsed) {
      setError('Kode lanjutan gak valid. Pastiin kamu nyalin utuh dari halaman pembayaran sebelumnya.');
      return;
    }
    setLoading(true);
    setError(null);
    setClosedMessage(null);
    try {
      const res = await fetch(`/api/status?type=${parsed.type}&id=${encodeURIComponent(parsed.id)}`);
      const json = await res.json();
      const status = json.status as string | undefined;

      if (status === 'ready' || status === 'claimed' || status === 'credited') {
        setPending(parsed);
        setStage('done');
        removePendingOrder(rawCode);
        setSavedOrders(loadPendingOrders());
        return;
      }
      if (status === 'invalid') {
        setPending(parsed);
        setClosedMessage('Transaksi ini ditolak admin. Kalau ngerasa ini salah, silakan bikin transaksi baru dan hubungi admin.');
        setStage('closed');
        removePendingOrder(rawCode);
        setSavedOrders(loadPendingOrders());
        return;
      }
      if (status === 'expired') {
        setPending(parsed);
        setClosedMessage('Transaksi ini udah kedaluwarsa. Silakan bikin transaksi baru.');
        setStage('closed');
        removePendingOrder(rawCode);
        setSavedOrders(loadPendingOrders());
        return;
      }
      if (!status || status === 'unknown') {
        setError('Transaksi gak ditemukan. Cek lagi kode-nya, atau kemungkinan udah lewat 24 jam dan otomatis kedaluwarsa.');
        return;
      }

      // Masih 'pending' -- boleh upload/upload ulang bukti bayar.
      setPending(parsed);
      setStage('form');
    } catch {
      setError('Gagal menghubungi server, coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitProof() {
    if (!pending || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('type', pending.type);
      form.set('id', pending.id);
      form.set('token', pending.token);
      form.set('note', note);
      form.set('file', file);
      const res = await fetch('/api/manual-proof', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Gagal upload bukti bayar, coba lagi.');
        setSubmitting(false);
        return;
      }
      setStage('waiting');
    } catch {
      setError('Gagal menghubungi server, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  // Polling pas nunggu verifikasi admin.
  useEffect(() => {
    if (stage !== 'waiting' || !pending) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?type=${pending.type}&id=${encodeURIComponent(pending.id)}`);
        const json = await res.json();
        if (json.status === 'ready' || json.status === 'claimed' || json.status === 'credited') {
          setStage('done');
          removePendingOrder(buildResumeCode(pending));
          setSavedOrders(loadPendingOrders());
          clearInterval(interval);
        }
        if (json.status === 'invalid') {
          setClosedMessage('Transaksi ini ditolak admin. Kalau ngerasa ini salah, silakan bikin transaksi baru dan hubungi admin.');
          setStage('closed');
          removePendingOrder(buildResumeCode(pending));
          setSavedOrders(loadPendingOrders());
          clearInterval(interval);
        }
      } catch {
        // coba lagi interval berikutnya
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [stage, pending]);

  function reset() {
    setCode('');
    setPending(null);
    setStage('input');
    setError(null);
    setClosedMessage(null);
    setNote('');
    setFile(null);
  }

  return (
    <div className="flex flex-col gap-5 animate-rise-in">
      <Link href="/" className="flex items-center gap-1 text-xs text-paper-muted w-fit hover:text-paper transition">
        <ChevronLeft size={14} strokeWidth={2.5} /> Kembali
      </Link>

      {stage === 'input' && (
        <>
          <div>
            <h1 className="font-display font-bold text-xl">Lanjutkan pembayaran</h1>
            <p className="mt-1 text-sm text-paper-muted">
              Buat transaksi manual (QRIS luar negeri) yang belum sempet kamu kirim bukti bayarnya. Tempel kode lanjutan yang
              muncul pas checkout.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-paper-muted">Kode lanjutan</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLookup(code);
                }}
                placeholder="diamond:MANUAL-DMD-XXXX-.../premium:claim-id:token"
                className="flex-1 min-w-0 rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm font-mono outline-none transition focus:border-brand/60"
              />
              <button
                disabled={!code.trim() || loading}
                onClick={() => handleLookup(code)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand text-ink font-bold px-4 text-sm transition hover:bg-brand/90 disabled:opacity-40 shrink-0"
              >
                {loading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <Search size={16} strokeWidth={2.5} />}
              </button>
            </div>
            <p className="text-[11px] text-paper-muted">
              Cuma ref transaksi (misal <span className="font-mono">MANUAL-DMD-...</span>) gak cukup -- kode lanjutan lengkap
              yang dikasih pas checkout wajib disertain, biar orang lain gak bisa asal utak-atik transaksi kamu.
            </p>
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-bad">
              <AlertCircle size={16} strokeWidth={2.25} className="shrink-0 mt-0.5" /> {error}
            </p>
          )}

          {savedOrders.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-[11px] font-bold tracking-[0.1em] text-paper-muted uppercase">Tersimpan di device ini</p>
              <div className="flex flex-col gap-2">
                {savedOrders.map((o) => {
                  const TypeIcon = o.type === 'premium' ? Sparkles : Gem;
                  return (
                    <button
                      key={o.resumeCode}
                      onClick={() => {
                        setCode(o.resumeCode);
                        handleLookup(o.resumeCode);
                      }}
                      className="ticket flex items-center gap-3 px-4 py-3 text-left transition hover:border-brand/40"
                    >
                      <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${o.type === 'premium' ? 'bg-gold/15' : 'bg-diamond/15'}`}>
                        <TypeIcon size={16} strokeWidth={2.25} className={o.type === 'premium' ? 'text-gold' : 'text-diamond'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{o.label}</p>
                        <p className="text-xs text-paper-muted mt-0.5">{formatRupiah(o.amount)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {stage === 'form' && pending && (
        <>
          <h2 className="font-display font-bold text-lg">Scan QRIS &amp; kirim bukti bayar</h2>
          <div className="ticket overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <div className="bg-white rounded-2xl p-3 mx-auto w-full max-w-[300px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/manual-qris-qr.png" alt="QRIS" className="w-full h-auto" />
              </div>
            </div>
            <a
              href="/manual-qris-qr.png"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-full border border-ink-line text-paper font-semibold py-2.5 text-xs mt-1 mx-5 mb-4 transition hover:border-brand/60 hover:text-brand"
            >
              <Download size={14} strokeWidth={2.5} /> Buka QRIS
            </a>
          </div>

          <div>
            <label className="text-xs text-paper-muted">Catatan / no. referensi transaksi (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="misal: TnG ref #123456"
              className="mt-1.5 w-full rounded-xl bg-ink-field border border-ink-line px-4 py-3 text-sm outline-none transition focus:border-brand/60"
            />
          </div>

          <div>
            <label className="text-xs text-paper-muted">Screenshot bukti bayar</label>
            <label className="mt-1.5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-line py-6 text-sm text-paper-muted cursor-pointer transition hover:border-brand/60 hover:text-paper">
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
            className="flex items-center justify-center gap-2 rounded-full bg-brand text-ink font-bold py-3.5 text-sm transition hover:bg-brand/90 disabled:opacity-40"
          >
            {submitting && <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />}
            {submitting ? 'Mengirim...' : 'Kirim bukti bayar'}
          </button>

          <button onClick={reset} className="text-xs text-paper-muted underline w-fit mx-auto">
            Batal, pakai kode lain
          </button>
        </>
      )}

      {stage === 'waiting' && (
        <div className="flex flex-col items-center text-center gap-4 pt-10">
          <div className="w-16 h-16 rounded-full bg-brand/15 flex items-center justify-center">
            <Clock size={28} strokeWidth={2} className="text-brand" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Menunggu verifikasi</h2>
            <p className="mt-1 text-sm text-paper-muted">
              Bukti bayar kamu lagi dicek manual sama admin. Halaman ini otomatis update begitu udah dikonfirmasi.
            </p>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center text-center gap-4 pt-10">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-good/20 animate-ring-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-good/15 flex items-center justify-center animate-pop-in">
              <CheckCircle2 size={30} strokeWidth={2} className="text-good" />
            </div>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Pembayaran dikonfirmasi</h2>
            <p className="mt-1 text-sm text-paper-muted">Transaksi ini udah kelar. Cek app Aniku buat lihat perubahannya.</p>
          </div>
          <button onClick={reset} className="mt-2 rounded-full bg-brand text-ink font-bold px-6 py-2.5 text-sm transition hover:bg-brand/90">
            Cek kode lain
          </button>
        </div>
      )}

      {stage === 'closed' && (
        <div className="flex flex-col items-center text-center gap-4 pt-10">
          <div className="w-16 h-16 rounded-full bg-bad/15 flex items-center justify-center">
            <XCircle size={28} strokeWidth={2} className="text-bad" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Transaksi ini udah ditutup</h2>
            <p className="mt-1 text-sm text-paper-muted">{closedMessage}</p>
          </div>
          <button onClick={reset} className="mt-2 rounded-full bg-brand text-ink font-bold px-6 py-2.5 text-sm transition hover:bg-brand/90">
            Cek kode lain
          </button>
        </div>
      )}
    </div>
  );
}
