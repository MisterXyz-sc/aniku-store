import Link from 'next/link';
import { Crown, Gem, ShieldCheck, Zap, Clock3, ArrowRight, ListChecks, HelpCircle } from 'lucide-react';

const STEPS = [
  {
    title: 'Pilih produk',
    body: 'Aniku Premium buat langganan, atau top-up Diamond buat sekali beli.'
  },
  {
    title: 'Masukin ID Aniku',
    body: 'Angka unik di profilmu (bukan username), biar gak salah kirim.'
  },
  {
    title: 'Scan QRIS & bayar',
    body: 'Otomatis masuk ke akun begitu pembayaran terverifikasi.'
  }
];

const FAQS = [
  {
    q: 'ID Aniku itu apa, dan di mana nemuinnya?',
    a: 'Angka unik di belakang tanda # pada profilmu di app Aniku. Beda dari username, dan gak berubah walau kamu ganti nama tampilan.'
  },
  {
    q: 'Kenapa isi ID, bukan username?',
    a: 'Username bisa diganti kapan aja, jadi rawan salah kirim. ID Aniku tetap, jadi top-up-nya pasti nyampe ke akun yang tepat.'
  },
  {
    q: 'Berapa lama sampai masuk ke akun?',
    a: 'Otomatis begitu pembayaran QRIS terverifikasi, biasanya di bawah semenit. Halaman pembayaran akan update sendiri tanpa perlu refresh.'
  },
  {
    q: 'Metode pembayaran apa aja?',
    a: 'Saat ini QRIS saja, jadi bisa dibayar dari e-wallet atau m-banking apa pun yang mendukung QRIS.'
  }
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 animate-rise-in">
      <div>
        <h1 className="font-display font-bold text-2xl leading-tight">Mau beli apa hari ini?</h1>
        <p className="mt-1 text-sm text-paper-muted">Pilih produk, isi ID Aniku kamu, bayar QRIS.</p>
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href="/premium"
          className="foil-card group rounded-2xl border border-ink-line bg-gradient-to-br from-[#2A2016] via-ink-raised to-ink-raised p-5 shadow-card transition hover:border-gold/50"
        >
          <div className="relative z-[2] flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <Crown size={22} strokeWidth={2.25} className="text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-base">Aniku Premium</p>
                <span className="text-[10px] font-bold tracking-[0.12em] text-gold bg-gold/10 rounded-full px-2 py-1 shrink-0">
                  MULAI 7RB
                </span>
              </div>
              <p className="mt-1 text-xs text-paper-muted leading-relaxed">
                Bebas iklan, badge eksklusif &amp; bonus Diamond.
              </p>
            </div>
          </div>
          <div className="relative z-[2] mt-4 flex items-center justify-between text-xs font-semibold text-gold">
            Lihat paket
            <ArrowRight size={14} strokeWidth={2.5} className="transition group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          href="/diamond"
          className="foil-card group rounded-2xl border border-ink-line bg-gradient-to-br from-[#132A30] via-ink-raised to-ink-raised p-5 shadow-card transition hover:border-diamond/50"
        >
          <div className="relative z-[2] flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-diamond to-diamond-dark flex items-center justify-center">
              <Gem size={22} strokeWidth={2.25} className="text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-base">Top-up Diamond</p>
                <span className="text-[10px] font-bold tracking-[0.12em] text-diamond bg-diamond/10 rounded-full px-2 py-1 shrink-0">
                  MULAI 5RB
                </span>
              </div>
              <p className="mt-1 text-xs text-paper-muted leading-relaxed">
                Buat Clan, kontribusi &amp; naik Top Support.
              </p>
            </div>
          </div>
          <div className="relative z-[2] mt-4 flex items-center justify-between text-xs font-semibold text-diamond">
            Top-up sekarang
            <ArrowRight size={14} strokeWidth={2.5} className="transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-line bg-ink-raised/50 px-4 py-3 text-[11px] text-paper-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} strokeWidth={2.25} className="text-good" /> QRIS resmi
        </span>
        <span className="flex items-center gap-1.5">
          <Zap size={14} strokeWidth={2.25} className="text-gold" /> Otomatis masuk
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 size={14} strokeWidth={2.25} className="text-diamond" /> 24 jam
        </span>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ListChecks size={16} strokeWidth={2.25} className="text-brand" />
          <h2 className="font-display font-bold text-base">Cara kerja</h2>
        </div>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-xl border border-ink-line bg-ink-raised/40 p-3.5">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brand/15 text-brand text-xs font-bold flex items-center justify-center font-mono">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-xs text-paper-muted leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} strokeWidth={2.25} className="text-brand" />
          <h2 className="font-display font-bold text-base">Pertanyaan umum</h2>
        </div>
        <div className="flex flex-col gap-2">
          {FAQS.map((item) => (
            <details key={item.q} className="group rounded-xl border border-ink-line bg-ink-raised/40 px-4 py-3">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold marker:content-none">
                {item.q}
                <ArrowRight
                  size={14}
                  strokeWidth={2.5}
                  className="shrink-0 text-paper-muted transition-transform duration-200 group-open:rotate-90"
                />
              </summary>
              <p className="mt-2 text-xs text-paper-muted leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
