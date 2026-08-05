import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 animate-rise-in">
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
            <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-2xl">
              👑
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-base">Aniku Premium</p>
                <span className="text-[10px] font-bold tracking-[0.12em] text-gold bg-gold/10 rounded-full px-2 py-1 shrink-0">
                  MULAI 7RB
                </span>
              </div>
              <p className="mt-1 text-xs text-paper-muted leading-relaxed">
                Bebas iklan, badge eksklusif & bonus Diamond.
              </p>
            </div>
          </div>
          <div className="relative z-[2] mt-4 flex items-center justify-between text-xs font-semibold text-gold">
            Lihat paket
            <span className="transition group-hover:translate-x-0.5">→</span>
          </div>
        </Link>

        <Link
          href="/diamond"
          className="foil-card group rounded-2xl border border-ink-line bg-gradient-to-br from-[#132A30] via-ink-raised to-ink-raised p-5 shadow-card transition hover:border-diamond/50"
        >
          <div className="relative z-[2] flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-diamond to-diamond-dark flex items-center justify-center text-2xl">
              💎
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-base">Top-up Diamond</p>
                <span className="text-[10px] font-bold tracking-[0.12em] text-diamond bg-diamond/10 rounded-full px-2 py-1 shrink-0">
                  MULAI 5RB
                </span>
              </div>
              <p className="mt-1 text-xs text-paper-muted leading-relaxed">
                Buat Clan, kontribusi & naik Top Support.
              </p>
            </div>
          </div>
          <div className="relative z-[2] mt-4 flex items-center justify-between text-xs font-semibold text-diamond">
            Top-up sekarang
            <span className="transition group-hover:translate-x-0.5">→</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-ink-line bg-ink-raised/50 px-4 py-3 text-[11px] text-paper-muted">
        <span className="flex items-center gap-1.5">🔒 QRIS resmi</span>
        <span className="flex items-center gap-1.5">⚡ Otomatis masuk</span>
        <span className="flex items-center gap-1.5">🕐 24 jam</span>
      </div>
    </div>
  );
}
