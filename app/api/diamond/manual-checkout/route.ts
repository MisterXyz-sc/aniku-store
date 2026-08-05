import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const MIN_AMOUNT = 500;
const MAX_AMOUNT = 2_000_000;
const RUPIAH_PER_DIAMOND = 4;

// Versi manual dari /api/diamond/checkout -- gak manggil Sakurupiah, QR-nya
// statis, approval-nya manual lewat admin panel.
export async function POST(req: NextRequest) {
  try {
    const { user_number: rawUserNumber, amount: rawAmount } = await req.json();
    const userNumber = Math.floor(Number(rawUserNumber));
    const amount = Math.floor(Number(rawAmount));

    if (!rawUserNumber || isNaN(userNumber) || userNumber <= 0) {
      return NextResponse.json({ error: 'ID Aniku wajib diisi dengan angka yang valid' }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: `Nominal harus antara Rp${MIN_AMOUNT.toLocaleString('id-ID')} - Rp${MAX_AMOUNT.toLocaleString('id-ID')}` },
        { status: 400 }
      );
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('user_number', userNumber)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'ID Aniku gak ditemukan' }, { status: 404 });
    }

    const diamondAmount = Math.floor(amount / RUPIAH_PER_DIAMOND);
    const merchantRef = `MANUAL-DMD-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${Date.now()}`;

    const { error: insertErr } = await supabaseAdmin.from('diamond_topups').insert({
      user_id: profile.id,
      amount_rupiah: amount,
      diamond_amount: diamondAmount,
      payment_ref: merchantRef,
      payment_status: 'pending',
      status: 'pending',
      payment_method: 'manual_qris',
      manual_review_status: 'awaiting_proof'
    });

    if (insertErr) {
      console.error('Failed to insert manual diamond_topups row:', insertErr);
      return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
    }

    return NextResponse.json({
      merchant_ref: merchantRef,
      amount,
      diamond_amount: diamondAmount,
      username: profile.username
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
