import type { Metadata } from 'next';
import { Baloo_2, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import SidebarMenu from '@/components/SidebarMenu';
import './globals.css';

const display = Baloo_2({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display'
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body'
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'Aniku Store — Premium & Diamond',
  description: 'Beli Aniku Premium atau top-up Diamond langsung dari browser, bayar QRIS, langsung masuk ke akunmu.',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-ink font-body text-paper antialiased">
        <div className="mx-auto max-w-md min-h-screen flex flex-col">
          <header className="flex items-center gap-3 px-5 py-5">
            <Image
              src="/aniku-icon.png"
              alt="Aniku"
              width={40}
              height={40}
              className="rounded-[11px] shrink-0"
              priority
            />
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-display font-bold text-xl leading-none tracking-tight">aniku</p>
              <span className="rounded-full bg-brand/15 text-brand text-[10px] font-bold tracking-[0.14em] px-2 py-1 leading-none">
                STORE
              </span>
            </div>
            <SidebarMenu />
          </header>

          <main className="flex-1 px-5 pb-8">{children}</main>

          <footer className="px-5 py-5 text-center text-[11px] text-paper-muted leading-relaxed">
            Pembayaran diproses aman lewat QRIS.
            <br />
            Aniku Store bukan bagian dari Sakurupiah.
            <br />
            <Link href="/cek-status" className="mt-1 inline-block text-paper-muted underline decoration-ink-line underline-offset-2 hover:text-paper transition">
              Cek status transaksi
            </Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
