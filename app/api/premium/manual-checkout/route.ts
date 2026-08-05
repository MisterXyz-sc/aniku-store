import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Sama kayak /api/premium/checkout, TAPI gak manggil Sakurupiah -- ini buat
// pembeli yang e-wallet-nya gak konek ke Sakurupiah (misal Malaysia). QR yang
// dipake QRIS statis (public/manual-qris.png), bukan invoice dinamis.
// Approval-nya manual lewat admin panel, bukan webhook otomatis.
export async function POST(req: NextRequest) {
  try {
    const { user_number: rawUserNumber, package_id } = await req.json();
    const userNumber = Math.floor(Number(rawUserNumber));

    if (!rawUserNumber || isNaN(userNumber) || userNumber <= 0 || !package_id) {
      return NextResponse.json({ error: 'ID Aniku dan paket wajib diisi' }, { status: 400 });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('user_number', userNumber)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'ID Aniku gak ditemukan' }, { status: 404 });
    }

    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from('premium_packages')
      .select('*')
      .eq('id', package_id)
      .eq('is_active', true)
      .maybeSingle();

    if (pkgErr || !pkg) {
      return NextResponse.json({ error: 'Paket gak ditemukan atau gak aktif' }, { status: 404 });
    }

    const code = 'ANK-' + Math.random().toString(16).slice(2, 8).toUpperCase();
    const merchantRef = `MANUAL-${code}-${Date.now()}`;
    // Token rahasia -- HANYA dibalikin ke client yang bikin transaksi ini.
    // Dipakai buat verifikasi kepemilikan pas submit bukti bayar di
    // /api/manual-proof, biar claim_id doang gak cukup buat orang lain
    // upload/overwrite bukti punya user ini.
    const proofToken = crypto.randomUUID();

    // status tetep 'pending' (SAMA kayak flow Sakurupiah) -- biar RPC
    // grant_premium_from_claim yang dipanggil pas admin approve nanti gak
    // ke-block sama guard "claim.status !== pending/expired" di dalemnya.
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from('premium_claims')
      .insert({
        code,
        sender_id: profile.id,
        target_user_id: profile.id,
        package_id: pkg.id,
        amount_expected: pkg.price,
        claim_type: 'direct',
        max_claims: 1,
        status: 'pending',
        payment_ref: merchantRef,
        payment_method: 'manual_qris',
        manual_review_status: 'awaiting_proof',
        proof_token: proofToken
      })
      .select()
      .single();

    if (claimErr || !claim) {
      console.error('Failed to create manual premium_claims row:', claimErr);
      return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 });
    }

    return NextResponse.json({
      claim_id: claim.id,
      merchant_ref: merchantRef,
      amount: pkg.price,
      username: profile.username,
      proof_token: proofToken
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
