import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import type { StatusKind } from '@/lib/types';

// Endpoint khusus ADMIN buat nampilin SEMUA transaksi (premium + diamond),
// bukan cuma yang pending kayak /api/admin/manual-payments, dan bukan cuma
// yang berhasil kayak /api/history publik. Dipake buat halaman "Riwayat
// Transaksi" di app admin: tab Berhasil / Pending / Ditolak.
//
// Query params:
//   status = 'success' | 'pending' | 'rejected' | 'all'  (default: 'all')
//   q      = cari username / ref / catatan (opsional)
//   limit  = default 30, max 100
//   offset = default 0 (buat load more / paging)

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function translateStatus(
  status: string | null,
  paymentMethod: string | null,
  manualReviewStatus: string | null
): { label: string; kind: StatusKind } {
  const isManual = paymentMethod === 'manual_qris';

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
  if (isManual) {
    if (manualReviewStatus === 'submitted') {
      return { label: 'Menunggu review admin', kind: 'review' };
    }
    return { label: 'Menunggu bukti pembayaran', kind: 'pending' };
  }
  return { label: 'Menunggu pembayaran', kind: 'pending' };
}

// Grup kind ke 3 kategori tab yang diminta di app admin.
function toTab(kind: StatusKind): 'success' | 'pending' | 'rejected' {
  if (kind === 'good') return 'success';
  if (kind === 'bad') return 'rejected';
  return 'pending'; // 'pending' | 'review'
}

type Row = {
  id: string;
  payment_ref: string | null;
  status: string | null;
  payment_method: string | null;
  manual_review_status: string | null;
  manual_note: string | null;
  manual_proof_url: string | null;
  created_at: string;
  amount: number;
  label: string;
  username: string;
  type: 'premium' | 'diamond';
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const statusFilter = (req.nextUrl.searchParams.get('status') ?? 'all') as
    | 'success'
    | 'pending'
    | 'rejected'
    | 'all';
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(req.nextUrl.searchParams.get('offset') ?? 0) || 0, 0);

  const { data: premiumRows, error: premiumErr } = await supabaseAdmin
    .from('premium_claims')
    .select(
      'id, target_user_id, package_id, payment_ref, amount_expected, status, payment_method, manual_review_status, manual_note, manual_proof_url, created_at'
    )
    .not('payment_ref', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (premiumErr) console.error('Failed to list premium_claims (admin history):', premiumErr);

  const { data: diamondRows, error: diamondErr } = await supabaseAdmin
    .from('diamond_topups')
    .select(
      'id, user_id, payment_ref, amount_rupiah, diamond_amount, status, payment_method, manual_review_status, manual_note, manual_proof_url, created_at'
    )
    .not('payment_ref', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (diamondErr) console.error('Failed to list diamond_topups (admin history):', diamondErr);

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

  const premium: Row[] = (premiumRows ?? []).map((r) => ({
    id: r.id,
    payment_ref: r.payment_ref,
    status: r.status,
    payment_method: r.payment_method,
    manual_review_status: r.manual_review_status,
    manual_note: r.manual_note,
    manual_proof_url: r.manual_proof_url,
    created_at: r.created_at,
    amount: r.amount_expected ?? 0,
    label: (r.package_id && labelById.get(r.package_id)) || 'Premium',
    username: usernameById.get(r.target_user_id) ?? '(gak diketahui)',
    type: 'premium'
  }));

  const diamond: Row[] = (diamondRows ?? []).map((r) => ({
    id: r.id,
    payment_ref: r.payment_ref,
    status: r.status,
    payment_method: r.payment_method,
    manual_review_status: r.manual_review_status,
    manual_note: r.manual_note,
    manual_proof_url: r.manual_proof_url,
    created_at: r.created_at,
    amount: r.amount_rupiah ?? 0,
    label: `Top-up ${(r.diamond_amount ?? 0).toLocaleString('id-ID')} Diamond`,
    username: usernameById.get(r.user_id) ?? '(gak diketahui)',
    type: 'diamond'
  }));

  let all = [...premium, ...diamond].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Terjemahin status + filter tab.
  let mapped = all.map((r) => {
    const { label: status_label, kind } = translateStatus(r.status, r.payment_method, r.manual_review_status);
    return {
      type: r.type,
      id: r.id,
      merchant_ref: r.payment_ref,
      username: r.username,
      label: r.label,
      amount: r.amount,
      is_manual: r.payment_method === 'manual_qris',
      status_label,
      status_kind: kind,
      tab: toTab(kind),
      manual_note: r.manual_note,
      created_at: r.created_at
    };
  });

  if (statusFilter !== 'all') {
    mapped = mapped.filter((r) => r.tab === statusFilter);
  }

  if (q) {
    mapped = mapped.filter((r) =>
      [r.username, r.label, r.merchant_ref ?? '', r.manual_note ?? '', r.type].join(' ').toLowerCase().includes(q)
    );
  }

  const total = mapped.length;
  const page = mapped.slice(offset, offset + limit);

  // Ringkasan jumlah per kategori (buat badge di tab UI), dihitung dari
  // seluruh data yang match search, tanpa filter status.
  const searched = q
    ? all
        .map((r) => {
          const { kind } = translateStatus(r.status, r.payment_method, r.manual_review_status);
          return { ...r, tab: toTab(kind) };
        })
        .filter((r) =>
          [r.username, r.label, r.payment_ref ?? '', r.manual_note ?? '', r.type].join(' ').toLowerCase().includes(q)
        )
    : all.map((r) => {
        const { kind } = translateStatus(r.status, r.payment_method, r.manual_review_status);
        return { ...r, tab: toTab(kind) };
      });

  const counts = {
    success: searched.filter((r) => r.tab === 'success').length,
    pending: searched.filter((r) => r.tab === 'pending').length,
    rejected: searched.filter((r) => r.tab === 'rejected').length
  };

  return NextResponse.json({ items: page, total, counts });
}
