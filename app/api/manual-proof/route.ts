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
    const token = form.get('token'); // proof_token -- WAJIB, bukti kepemilikan transaksi
    const note = form.get('note');
    const file = form.get('file');

    if (type !== 'premium' && type !== 'diamond') {
      return NextResponse.json({ error: 'Tipe transaksi gak valid' }, { status: 400 });
    }
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID transaksi wajib diisi' }, { status: 400 });
    }
    if (!token || typeof token !== 'string') {
      // Tanpa token ini siapapun yang tau/nebak id/payment_ref bisa upload
      // bukti buat transaksi orang lain (IDOR) -- jadi ini wajib, bukan opsional.
      return NextResponse.json({ error: 'Token transaksi gak valid' }, { status: 401 });
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
      .select('id, status, payment_method, proof_token')
      .eq(matchColumn, id)
      .maybeSingle();

    if (rowErr || !row) {
      return NextResponse.json({ error: 'Transaksi gak ditemukan' }, { status: 404 });
    }
    if (row.payment_method !== 'manual_qris') {
      return NextResponse.json({ error: 'Transaksi ini bukan pembayaran manual' }, { status: 400 });
    }
    // Cek kepemilikan: token yang dikirim harus SAMA PERSIS dengan yang
    // disimpan pas checkout. Ini yang mencegah orang lain (yang cuma tau
    // id/payment_ref, misal lewat /api/transactions) upload/overwrite bukti
    // punya user lain.
    if (!row.proof_token || row.proof_token !== token) {
      return NextResponse.json({ error: 'Token gak cocok, transaksi ini bukan punya kamu' }, { status: 403 });
    }

    // Pakai row.id (primary key dari DB, bukan input client mentah) buat
    // nama file storage -- biar gak ada celah path traversal / karakter aneh
    // dari `id` client masuk ke path bucket.
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${type}/${row.id}-${Date.now()}.${ext}`;
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
      .eq('id', row.id); // update row yang udah diverifikasi tokennya, bukan re-match by id/ref

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
