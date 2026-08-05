'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Crown, Gem, Globe, Search, Home, History } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: typeof Crown;
  accentText: string;
  accentBg: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    title: 'Produk lokal',
    items: [
      { href: '/premium', label: 'Aniku Premium', desc: 'Bayar QRIS, masuk otomatis', icon: Crown, accentText: 'text-gold', accentBg: 'bg-gold/15' },
      { href: '/diamond', label: 'Top-up Diamond', desc: 'Bayar QRIS, masuk otomatis', icon: Gem, accentText: 'text-diamond', accentBg: 'bg-diamond/15' }
    ]
  },
  {
    title: 'Bayar dari luar negeri',
    items: [
      { href: '/premium/manual', label: 'Aniku Premium', desc: 'QRIS manual, direview admin', icon: Crown, accentText: 'text-gold', accentBg: 'bg-gold/15' },
      { href: '/diamond/manual', label: 'Top-up Diamond', desc: 'QRIS manual, direview admin', icon: Gem, accentText: 'text-diamond', accentBg: 'bg-diamond/15' }
    ]
  }
];

export default function SidebarMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Nutup drawer otomatis begitu pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kunci scroll body pas drawer kebuka + bisa ditutup pake Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        className="ml-auto flex items-center justify-center w-9 h-9 shrink-0 rounded-full border border-ink-line text-paper-muted transition hover:border-brand/40 hover:text-paper"
      >
        <Menu size={18} strokeWidth={2.25} />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className={`fixed inset-y-0 right-0 z-50 w-[82%] max-w-xs bg-ink-raised border-l border-ink-line shadow-card flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-ink-line">
          <p className="font-display font-bold text-base">Menu</p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="flex items-center justify-center w-8 h-8 rounded-full text-paper-muted transition hover:bg-ink-field hover:text-paper"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          <Link
            href="/"
            className={`flex items-center gap-2.5 text-sm font-semibold transition hover:text-brand ${
              pathname === '/' ? 'text-brand' : 'text-paper'
            }`}
          >
            <Home size={16} strokeWidth={2.25} />
            Beranda
          </Link>

          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <p className="text-[11px] font-bold tracking-[0.1em] text-paper-muted uppercase">{group.title}</p>
              <div className="flex flex-col gap-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${
                        active ? 'bg-ink-field' : 'hover:bg-ink-field/60'
                      }`}
                    >
                      <div className={`w-8 h-8 shrink-0 rounded-lg ${item.accentBg} flex items-center justify-center`}>
                        <Icon size={15} strokeWidth={2.25} className={item.accentText} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${active ? 'text-paper' : 'text-paper'}`}>{item.label}</p>
                        <p className="text-[11px] text-paper-muted truncate">{item.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold tracking-[0.1em] text-paper-muted uppercase">Lainnya</p>
            <Link
              href="/cek-status"
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${
                pathname === '/cek-status' ? 'bg-ink-field' : 'hover:bg-ink-field/60'
              }`}
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-brand/15 flex items-center justify-center">
                <Search size={15} strokeWidth={2.25} className="text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-paper">Cek status transaksi</p>
                <p className="text-[11px] text-paper-muted truncate">Lacak pesanan pake ID Aniku / ref</p>
              </div>
            </Link>
            <Link
              href="/riwayat"
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${
                pathname === '/riwayat' ? 'bg-ink-field' : 'hover:bg-ink-field/60'
              }`}
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-good/15 flex items-center justify-center">
                <History size={15} strokeWidth={2.25} className="text-good" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-paper">Riwayat transaksi</p>
                <p className="text-[11px] text-paper-muted truncate">Transaksi berhasil dari semua user</p>
              </div>
            </Link>
          </div>
        </nav>

        <div className="px-5 py-4 border-t border-ink-line text-[11px] text-paper-muted leading-relaxed">
          Pembayaran diproses aman lewat QRIS.
        </div>
      </aside>
    </>
  );
}
