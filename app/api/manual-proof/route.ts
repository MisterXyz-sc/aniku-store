import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUCKET = 'manual-payment-proofs';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// User submit bukti bayar (screenshot) + catatan (misal no. referensi
// transaksi di app e-wallet-nya). File disimpen di storage privat, cuma
// bisa diliat admin lewat signed URL.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const type = form.get('type'); // 'premium' | 'diamond'
    const id = form.get('id'); // claim_id (premium) atau merchant_ref (diamond)
    const note = form.get('note');
    const file = form.get('file');

    if (type !== 'premium' && type !== 'diamond') {
      return NextResponse.json({ error: 'Tipe transaksi gak valid' }, { status: 400 });
    }
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID transaksi wajib diisi' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Bukti bayar (gambar) wajib diupload' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran gambar maksimal 5MB' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 });
    }

    const table = type === 'premium' ? 'premium_claims' : 'diamond_topups';
    const matchColumn = type === 'premium' ? 'id' : 'payment_ref';

    const { data: row, error: rowErr } = await supabaseAdmin
      .from(table)
      .select('id, status, payment_method')
      .eq(matchColumn, id)
      .maybeSingle();

    if (rowErr || !row) {
      return NextResponse.json({ error: 'Transaksi gak ditemukan' }, { status: 404 });
    }
    if (row.payment_method !== 'manual_qris') {
      return NextResponse.json({ error: 'Transaksi ini bukan pembayaran manual' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${type}/${id}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error('Failed to upload proof:', uploadErr);
      return NextResponse.json({ error: 'Gagal upload bukti bayar' }, { status: 500 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from(table)
      .update({
        manual_proof_url: path,
        manual_note: typeof note === 'string' ? note.slice(0, 500) : null,
        manual_review_status: 'submitted'
      })
      .eq(matchColumn, id);

    if (updateErr) {
      console.error('Failed to save proof reference:', updateErr);
      return NextResponse.json({ error: 'Gagal menyimpan bukti bayar' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
