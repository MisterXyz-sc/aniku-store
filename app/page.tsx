import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Mau beli apa hari ini?</h1>

      <Link
        href="/premium"
        className="rounded-2xl border border-aniku-border bg-aniku-card p-4 flex items-center gap-4 hover:border-aniku-gold/50 transition"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-aniku-gold to-orange-500 flex items-center justify-center text-2xl">
          👑
        </div>
        <div className="flex-1">
          <p className="font-bold">Aniku Premium</p>
          <p className="text-xs text-white/50">Bebas iklan, badge eksklusif & bonus Diamond</p>
        </div>
        <span className="text-white/30">›</span>
      </Link>

      <Link
        href="/diamond"
        className="rounded-2xl border border-aniku-border bg-aniku-card p-4 flex items-center gap-4 hover:border-sky-400/50 transition"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-2xl">
          💎
        </div>
        <div className="flex-1">
          <p className="font-bold">Top-up Diamond</p>
          <p className="text-xs text-white/50">Buat Clan, kontribusi & naik Top Support</p>
        </div>
        <span className="text-white/30">›</span>
      </Link>
    </div>
  );
}
