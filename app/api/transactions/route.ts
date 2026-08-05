import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { StatusKind, TransactionItem } from '@/lib/types';

// Dipake user buat cek status transaksi mereka sendiri kapan aja (bukan cuma
// pas nunggu di halaman checkout). BEDA dari /api/status:
// - /api/status: dipoll pas checkout, cuma balikin { status } mentah buat 1 id.
// - endpoint ini: bisa cari lewat ID Aniku (banyak transaksi terakhir) ATAU
//   ref. transaksi (1 transaksi), status-nya udah diterjemahin ke bahasa
//   manusia, dan gak pernah expose manual_proof_url (itu cuma buat admin).

const LIST_LIMIT = 10;

function translateStatus(
  status: string | null,
  paymentMethod: string | null,
  manualReviewStatus: string | null
): { label: string; kind: StatusKind } {
  const isManual = paymentMethod === 'manual_qris';

  // Ditolak admin (manual) selalu didahulukan, apapun status utamanya.
  if (isManual && manualReviewStatus === 'rejected') {
    return { label: 'Ditolak', kind: 'bad' };
  }

  if (status === 'ready' || status === 'claimed' || status === 'credited') {
    return { label: 'Berhasil', kind: 'good' };
  }
  if (status === 'invalid') {
    return { label: 'Ditolak', kind: 'bad' };
  }
  if (status === 'expired') {
    return { label: 'Kedaluwarsa', kind: 'bad' };
  }

  // Sisanya (masih 'pending' di kolom status utama).
  if (isManual) {
    if (manualReviewStatus === 'submitted') {
      return { label: 'Menunggu review admin', kind: 'review' };
    }
    return { label: 'Menunggu bukti pembayaran', kind: 'pending' };
  }

  return { label: 'Menunggu pembayaran', kind: 'pending' };
}

type PremiumRow = {
  payment_ref: string | null;
  amount_expected: number | null;
  package_id: string | null;
  status: string | null;
  payment_method: string | null;
  manual_review_status: string | null;
  manual_note: string | null;
  created_at: string;
};

type DiamondRow = {
  payment_ref: string | null;
  amount_rupiah: number | null;
  diamond_amount: number | null;
  status: string | null;
  payment_method: string | null;
  manual_review_status: string | null;
  manual_note: string | null;
  created_at: string;
};

async function mapPremiumRows(rows: PremiumRow[]): Promise<TransactionItem[]> {
  const packageIds = Array.from(new Set(rows.map((r) => r.package_id))).filter(Boolean) as string[];
  const labelById = new Map<string, string>();

  if (packageIds.length) {
    const { data: packageRows } = await supabaseAdmin.from('premium_packages').select('id, label').in('id', packageIds);
    (packageRows ?? []).forEach((p) => labelById.set(p.id, p.label));
  }

  return rows
    .filter((r) => !!r.payment_ref)
    .map((r) => {
      const { label, kind } = translateStatus(r.status, r.payment_method, r.manual_review_status);
      return {
        type: 'premium' as const,
        merchant_ref: r.payment_ref as string,
        label: (r.package_id && labelById.get(r.package_id)) || 'Premium',
        amount: r.amount_expected ?? 0,
        is_manual: r.payment_method === 'manual_qris',
        status_label: label,
        status_kind: kind,
        manual_note: r.manual_note,
        created_at: r.created_at
      };
    });
}

function mapDiamondRows(rows: DiamondRow[]): TransactionItem[] {
  return rows
    .filter((r) => !!r.payment_ref)
    .map((r) => {
      const { label, kind } = translateStatus(r.status, r.payment_method, r.manual_review_status);
      return {
        type: 'diamond' as const,
        merchant_ref: r.payment_ref as string,
        label: `Top-up ${(r.diamond_amount ?? 0).toLocaleString('id-ID')} Diamond`,
        amount: r.amount_rupiah ?? 0,
        is_manual: r.payment_method === 'manual_qris',
        status_label: label,
        status_kind: kind,
        manual_note: r.manual_note,
        created_at: r.created_at
      };
    });
}

const PREMIUM_SELECT =
  'payment_ref, amount_expected, package_id, status, payment_method, manual_review_status, manual_note, created_at';
const DIAMOND_SELECT =
  'payment_ref, amount_rupiah, diamond_amount, status, payment_method, manual_review_status, manual_note, created_at';

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('q') ?? '').trim();

  if (!raw) {
    return NextResponse.json({ error: 'Masukin ID Aniku atau ref. transaksi dulu' }, { status: 400 });
  }

  // ID Aniku = angka doang. Selain itu dianggap ref. transaksi (ANK-...,
  // DMD-..., MANUAL-ANK-..., MANUAL-DMD-...).
  const isUserNumber = /^\d+$/.test(raw);

  try {
    if (isUserNumber) {
      const userNumber = Math.floor(Number(raw));
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .eq('user_number', userNumber)
        .maybeSingle();

      if (profileErr || !profile) {
        return NextResponse.json({ error: 'ID Aniku gak ditemukan' }, { status: 404 });
      }

      const [{ data: premiumRows, error: premiumErr }, { data: diamondRows, error: diamondErr }] = await Promise.all([
        supabaseAdmin
          .from('premium_claims')
          .select(PREMIUM_SELECT)
          .eq('target_user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(LIST_LIMIT),
        supabaseAdmin
          .from('diamond_topups')
          .select(DIAMOND_SELECT)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(LIST_LIMIT)
      ]);

      if (premiumErr) console.error('Failed to list premium_claims for cek-status:', premiumErr);
      if (diamondErr) console.error('Failed to list diamond_topups for cek-status:', diamondErr);

      const [premiumItems, diamondItems] = await Promise.all([
        mapPremiumRows((premiumRows ?? []) as PremiumRow[]),
        Promise.resolve(mapDiamondRows((diamondRows ?? []) as DiamondRow[]))
      ]);

      const items = [...premiumItems, ...diamondItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, LIST_LIMIT);

      return NextResponse.json({ username: profile.username, items });
    }

    // Cari lewat ref. transaksi -- refnya emang selalu di-generate uppercase,
    // jadi ini biar toleran kalau user ngetik/paste huruf kecil.
    const ref = raw.toUpperCase();

    const [{ data: premiumRow, error: premiumErr }, { data: diamondRow, error: diamondErr }] = await Promise.all([
      supabaseAdmin
        .from('premium_claims')
        .select(`${PREMIUM_SELECT}, target_user_id`)
        .eq('payment_ref', ref)
        .maybeSingle(),
      supabaseAdmin.from('diamond_topups').select(`${DIAMOND_SELECT}, user_id`).eq('payment_ref', ref).maybeSingle()
    ]);

    if (premiumErr) console.error('Failed to look up premium_claims by ref:', premiumErr);
    if (diamondErr) console.error('Failed to look up diamond_topups by ref:', diamondErr);

    if (!premiumRow && !diamondRow) {
      return NextResponse.json({ error: 'Ref. transaksi gak ditemukan' }, { status: 404 });
    }

    const ownerId = premiumRow ? (premiumRow as PremiumRow & { target_user_id: string }).target_user_id : (diamondRow as DiamondRow & { user_id: string }).user_id;

    const { data: profile } = await supabaseAdmin.from('profiles').select('username').eq('id', ownerId).maybeSingle();

    const items = premiumRow
      ? await mapPremiumRows([premiumRow as PremiumRow])
      : mapDiamondRows([diamondRow as DiamondRow]);

    return NextResponse.json({ username: profile?.username, items });
  } catch (e) {
    console.error('cek-status lookup error:', e);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
