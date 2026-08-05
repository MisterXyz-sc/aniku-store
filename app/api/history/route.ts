import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Riwayat transaksi BERHASIL dari SEMUA user (manual ATAU otomatis, gak dibedain)
// -- buat social proof di landing page ("baru aja ada yang top-up X").
// Sengaja gak expose payment_ref/claim_id (biar gak balik jadi celah kayak
// /api/manual-proof yang udah dipatch), dan username disamarin sebagian
// biar halaman publik ini gak jadi cara gampang buat ngumpulin daftar
// username asli + nominal semua orang.
const LIMIT = 20;
const SUCCESS_STATUSES = ['ready', 'claimed', 'credited'];

function maskUsername(username: string): string {
  if (username.length <= 3) return username[0] + '***';
  return username.slice(0, 3) + '***';
}

export async function GET() {
  try {
    const [{ data: premiumRows, error: premiumErr }, { data: diamondRows, error: diamondErr }] = await Promise.all([
      supabaseAdmin
        .from('premium_claims')
        .select('target_user_id, package_id, amount_expected, created_at')
        .in('status', SUCCESS_STATUSES)
        .order('created_at', { ascending: false })
        .limit(LIMIT),
      supabaseAdmin
        .from('diamond_topups')
        .select('user_id, diamond_amount, amount_rupiah, created_at')
        .in('status', SUCCESS_STATUSES)
        .order('created_at', { ascending: false })
        .limit(LIMIT)
    ]);

    if (premiumErr) console.error('Failed to list premium history:', premiumErr);
    if (diamondErr) console.error('Failed to list diamond history:', diamondErr);

    const userIds = Array.from(
      new Set([...(premiumRows ?? []).map((r) => r.target_user_id), ...(diamondRows ?? []).map((r) => r.user_id)])
    ).filter(Boolean);
    const packageIds = Array.from(new Set((premiumRows ?? []).map((r) => r.package_id))).filter(Boolean);

    const usernameById = new Map<string, string>();
    const labelById = new Map<string, string>();

    if (userIds.length) {
      const { data: profileRows } = await supabaseAdmin.from('profiles').select('id, username').in('id', userIds);
      (profileRows ?? []).forEach((p) => usernameById.set(p.id, p.username));
    }
    if (packageIds.length) {
      const { data: packageRows } = await supabaseAdmin.from('premium_packages').select('id, label').in('id', packageIds);
      (packageRows ?? []).forEach((p) => labelById.set(p.id, p.label));
    }

    const premium = (premiumRows ?? []).map((row) => ({
      type: 'premium' as const,
      username: maskUsername(usernameById.get(row.target_user_id) ?? 'Aniku'),
      label: labelById.get(row.package_id) ?? 'Premium',
      amount: row.amount_expected ?? 0,
      created_at: row.created_at
    }));

    const diamond = (diamondRows ?? []).map((row) => ({
      type: 'diamond' as const,
      username: maskUsername(usernameById.get(row.user_id) ?? 'Aniku'),
      label: `Top-up ${(row.diamond_amount ?? 0).toLocaleString('id-ID')} Diamond`,
      amount: row.amount_rupiah ?? 0,
      created_at: row.created_at
    }));

    const items = [...premium, ...diamond]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, LIMIT);

    return NextResponse.json({ items });
  } catch (e) {
    console.error('history lookup error:', e);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
