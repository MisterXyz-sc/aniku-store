import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Verifikasi admin dari Aniku, bukan bikin sistem admin baru.
// Client kirim access_token Supabase Auth-nya (dari login di /admin/login),
// kita cek token itu valid, terus cek profiles.is_admin buat user itu.
// Asumsi: profiles.id === auth.users.id (pola standar Supabase Auth).
export async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false as const, status: 401, error: 'Belum login' };
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false as const, status: 401, error: 'Sesi gak valid, login ulang' };
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, username, is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr || !profile || !profile.is_admin) {
    return { ok: false as const, status: 403, error: 'Akun ini bukan admin' };
  }

  return { ok: true as const, adminId: profile.id, adminUsername: profile.username as string };
}
