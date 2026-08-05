import { createClient } from '@supabase/supabase-js';

// Client ini pakai ANON KEY -- aman dipakai di browser (client component),
// cuma bisa baca data yang emang udah public lewat RLS (misal daftar paket).
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
