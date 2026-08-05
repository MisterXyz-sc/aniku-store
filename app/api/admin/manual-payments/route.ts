import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

const BUCKET = 'manual-payment-proofs';
const SIGNED_URL_TTL = 60 * 10; // 10 menit, cukup buat direview admin

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Catatan: premium_claims punya 2 kolom FK ke profiles (sender_id &
  // target_user_id), jadi embed langsung ("profiles:target_user_id(...)")
  // beresiko ambigu di PostgREST. Lebih aman fetch profiles/paket terpisah.
  const { data: premiumRows, error: premiumErr } = await supabaseAdmin
    .from('premium_claims')
    .select('id, target_user_id, package_id, payment_ref, amount_expected, manual_proof_url, manual_note, created_at')
    .eq('payment_method', 'manual_qris')
    .eq('manual_review_status', 'submitted')
    .order('created_at', { ascending: true });

  if (premiumErr) console.error('Failed to list premium manual claims:', premiumErr);

  const { data: diamondRows, error: diamondErr } = await supabaseAdmin
    .from('diamond_topups')
    .select('id, user_id, payment_ref, amount_rupiah, diamond_amount, manual_proof_url, manual_note, created_at')
    .eq('payment_method', 'manual_qris')
    .eq('manual_review_status', 'submitted')
    .order('created_at', { ascending: true });

  if (diamondErr) console.error('Failed to list diamond manual topups:', diamondErr);

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

  async function withSignedUrl(path: string | null) {
    if (!path) return null;
    const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
    return data?.signedUrl ?? null;
  }

  const premium = await Promise.all(
    (premiumRows ?? []).map(async (row) => ({
      type: 'premium' as const,
      id: row.id,
      merchant_ref: row.payment_ref,
      username: usernameById.get(row.target_user_id) ?? '(gak diketahui)',
      label: labelById.get(row.package_id) ?? 'Premium',
      amount: row.amount_expected,
      manual_proof_url: await withSignedUrl(row.manual_proof_url),
      manual_note: row.manual_note,
      created_at: row.created_at
    }))
  );

  const diamond = await Promise.all(
    (diamondRows ?? []).map(async (row) => ({
      type: 'diamond' as const,
      id: row.id,
      merchant_ref: row.payment_ref,
      username: usernameById.get(row.user_id) ?? '(gak diketahui)',
      label: `Top-up ${row.diamond_amount} Diamond`,
      amount: row.amount_rupiah,
      manual_proof_url: await withSignedUrl(row.manual_proof_url),
      manual_note: row.manual_note,
      created_at: row.created_at
    }))
  );

  return NextResponse.json({ items: [...premium, ...diamond] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { type, id, action } = await req.json();

  if (type !== 'premium' && type !== 'diamond') {
    return NextResponse.json({ error: 'Tipe gak valid' }, { status: 400 });
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Aksi gak valid' }, { status: 400 });
  }

  if (type === 'premium') {
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from('premium_claims')
      .select('*, premium_packages(*)')
      .eq('id', id)
      .eq('payment_method', 'manual_qris')
      .maybeSingle();

    if (claimErr || !claim) {
      return NextResponse.json({ error: 'Transaksi gak ditemukan' }, { status: 404 });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('premium_claims')
        .update({ manual_review_status: 'rejected', status: 'invalid' })
        .eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (claim.status !== 'pending' && claim.status !== 'expired') {
      return NextResponse.json({ error: 'Transaksi ini udah diproses sebelumnya' }, { status: 409 });
    }

    const pkg = claim.premium_packages as { duration_days: number };
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + pkg.duration_days);

    // RPC yang SAMA PERSIS dipakai sakurupiah-callback pas pembayaran
    // otomatis sukses -- biar logic pemberian Premium-nya konsisten.
    const { error: rpcError } = await supabaseAdmin.rpc('grant_premium_from_claim', {
      p_claim_id: claim.id,
      p_sociabuzz_ref: `manual-qris-${claim.payment_ref}-by-${auth.adminUsername}`,
      p_amount: claim.amount_expected,
      p_premium_until: premiumUntil.toISOString()
    });

    if (rpcError) {
      console.error('grant_premium_from_claim (manual) failed:', rpcError);
      return NextResponse.json({ error: 'Gagal memberikan Premium' }, { status: 500 });
    }

    await supabaseAdmin.from('premium_claims').update({ manual_review_status: 'approved' }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // type === 'diamond'
  const { data: topup, error: topupErr } = await supabaseAdmin
    .from('diamond_topups')
    .select('*')
    .eq('id', id)
    .eq('payment_method', 'manual_qris')
    .maybeSingle();

  if (topupErr || !topup) {
    return NextResponse.json({ error: 'Transaksi gak ditemukan' }, { status: 404 });
  }

  if (action === 'reject') {
    await supabaseAdmin
      .from('diamond_topups')
      .update({ manual_review_status: 'rejected', status: 'invalid' })
      .eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (topup.status !== 'pending') {
    return NextResponse.json({ error: 'Transaksi ini udah diproses sebelumnya' }, { status: 409 });
  }

  // RPC yang sama kayak sakurupiah-callback pas status "berhasil".
  const { data: credited, error: rpcError } = await supabaseAdmin.rpc('credit_diamond_topup', {
    p_topup_id: topup.id
  });

  if (rpcError) {
    console.error('credit_diamond_topup (manual) failed:', rpcError);
    return NextResponse.json({ error: 'Gagal memberikan Diamond' }, { status: 500 });
  }

  await supabaseAdmin.from('diamond_topups').update({ manual_review_status: 'approved' }).eq('id', id);
  return NextResponse.json({ ok: true, credited });
}
