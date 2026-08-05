import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aniku Store',
  description: 'Beli Premium & Diamond Aniku langsung dari browser.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-aniku-bg text-white antialiased">
        <div className="mx-auto max-w-md min-h-screen flex flex-col">
          <header className="flex items-center gap-3 px-5 py-4 border-b border-aniku-border">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aniku-red to-pink-600 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div>
              <p className="font-bold text-sm leading-none">Aniku Store</p>
              <p className="text-[11px] text-white/50 leading-none mt-1">Premium & Diamond</p>
            </div>
          </header>
          <main className="flex-1 px-5 py-6">{children}</main>
          <footer className="px-5 py-4 text-center text-[11px] text-white/30 border-t border-aniku-border">
            Pembayaran diproses aman lewat QRIS. Aniku Store bukan milik Sakurupiah.
          </footer>
        </div>
      </body>
    </html>
  );
}
