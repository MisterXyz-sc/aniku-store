# Aniku Store

Website checkout Premium & Diamond Aniku, tanpa login (isi username manual),
deploy ke Vercel. Halaman "toko" sendiri, tapi pembayaran QRIS-nya tetap
lewat Sakurupiah di belakang layar.

## Yang udah jadi

- Halaman `/premium` — pilih paket, isi username, checkout.
- Halaman `/diamond` — isi nominal, isi username, checkout.
- Polling status pembayaran otomatis tiap 4 detik.
- API route (`app/api/premium/checkout`, `app/api/diamond/checkout`) pakai
  Supabase **service role key** (bypass RLS, gak butuh login) buat bikin
  claim/topup atas nama username yang diinput, LALU manggil API Sakurupiah
  langsung (format request disamain persis kayak Edge Function
  `sakurupiah-create-invoice` / `sakurupiah-create-diamond-invoice` yang
  udah dipakai app Android) buat generate QRIS-nya.
- Webhook pembayaran (`sakurupiah-callback`) yang udah ada di Supabase
  otomatis kepake juga buat transaksi dari website ini -- gak perlu bikin
  webhook baru, karena `callback_url` yang dikirim ke Sakurupiah sama
  persis kayak yang dipakai app.

## Setup lokal

```bash
npm install
cp .env.local.example .env.local
# isi .env.local sesuai punya kamu
npm run dev
```

## Deploy ke Vercel

1. Push folder ini ke repo GitHub baru.
2. Buka vercel.com → New Project → Import repo itu.
3. Vercel otomatis detect Next.js.
4. Di step "Environment Variables", isi 5 variabel dari `.env.local.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — dari Supabase Dashboard → Settings → API.
   - `SAKURUPIAH_API_ID`, `SAKURUPIAH_API_KEY` — dari Supabase Dashboard →
     Edge Functions → Secrets (nilainya sama kayak yang dipakai
     `sakurupiah-create-invoice`).
   - `SAKURUPIAH_IS_PRODUCTION` — isi `true` (samain kayak yang di Edge Function).
5. Deploy. Dapet URL `nama-project.vercel.app` gratis.
6. (Opsional) tambah custom domain di Vercel Dashboard → Domains.

## Keamanan

- `SUPABASE_SERVICE_ROLE_KEY` **HARUS** cuma ada di Environment Variables
  Vercel (server-side), gak pernah nyampe ke browser. File
  `lib/supabaseAdmin.ts` sengaja dibuat gak bisa diimport dari komponen
  `'use client'`.
- RLS di tabel `premium_claims`/`diamond_topups` tetap aktif normal buat
  request dari app Android; service role di sini cuma dipakai lewat
  Vercel API route yang kita kontrol sendiri.
