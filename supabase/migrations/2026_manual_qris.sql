-- Manual QRIS payment support (buat pembeli luar negeri, misal Malaysia,
-- yang e-wallet-nya gak konek ke Sakurupiah).
--
-- SEMUA KOLOM BARU NULLABLE / ADA DEFAULT -- gak ada existing row yang keubah,
-- gak ada query lama yang bisa error gara-gara ini.
--
-- Jalanin ini di Supabase Dashboard -> SQL Editor.

-- 1. Kolom baru di premium_claims
alter table public.premium_claims
  add column if not exists payment_method text not null default 'sakurupiah',
  add column if not exists manual_proof_url text,
  add column if not exists manual_note text,
  add column if not exists manual_review_status text; -- null | 'submitted' | 'approved' | 'rejected'

-- 2. Kolom baru di diamond_topups
alter table public.diamond_topups
  add column if not exists payment_method text not null default 'sakurupiah',
  add column if not exists manual_proof_url text,
  add column if not exists manual_note text,
  add column if not exists manual_review_status text;

-- 3. Storage bucket privat buat bukti bayar (screenshot).
--    Privat -- gak ada yang bisa akses URL-nya langsung, admin panel generate
--    signed URL sementara pas nampilin buat direview.
insert into storage.buckets (id, name, public)
values ('manual-payment-proofs', 'manual-payment-proofs', false)
on conflict (id) do nothing;

-- Gak perlu bikin RLS policy buat storage.objects di bucket ini -- semua
-- upload & baca dilakuin server-side pake service role key (bypass RLS),
-- jadi anon/browser emang gak boleh akses langsung.

-- 4. FIX IDOR: token rahasia per transaksi manual, dipakai buat verifikasi
--    pas submit bukti bayar di /api/manual-proof. Tanpa ini, siapapun yang
--    tau/nebak id atau payment_ref bisa upload/overwrite bukti punya orang lain.
alter table public.premium_claims
  add column if not exists proof_token text;

alter table public.diamond_topups
  add column if not exists proof_token text;
