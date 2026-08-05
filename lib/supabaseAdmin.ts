import { createClient } from '@supabase/supabase-js';

// PENTING: file ini cuma boleh diimport dari server-side code (Route Handlers
// di app/api/**), JANGAN PERNAH diimport dari komponen client ('use client').
// Service role key bypass RLS -- kalau ke-expose ke browser, siapapun bisa
// baca/tulis semua tabel di database.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi di environment variables');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL belum diisi di environment variables');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);
