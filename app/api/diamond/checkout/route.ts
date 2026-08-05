import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSakurupiahInvoice } from '@/lib/sakurupiah';

// Batas nominal buat channel QRIS -- disamain kayak Edge Function
// sakurupiah-create-diamond-invoice (channel lain kayak DANA/GOPAY/VA
// sengaja gak dibuka di website ini, biar simpel; QRIS doang).
const QRIS_MIN = 500;
const QRIS_MAX = 2_000_000;
const RUPIAH_PER_DIAMOND = 4;

export async function POST(req: NextRequest) {
  try {
    const { user_number: rawUserNumber, amount: rawAmount } = await req.json();
    const userNumber = Math.floor(Number(rawUserNumber));
    const amount = Math.floor(Number(rawAmount));

    if (!rawUserNumber || isNaN(userNumber) || userNumber <= 0) {
      return NextResponse.json({ error: 'ID Aniku wajib diisi dengan angka yang valid' }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount < QRIS_MIN || amount > QRIS_MAX) {
      return NextResponse.json(
        {
          error: `Nominal harus antara Rp${QRIS_MIN.toLocaleString('id-ID')} - Rp${QRIS_MAX.toLocaleString('id-ID')}`
        },
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
    const merchantRef = `DMD-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${Date.now()}`;

    const invoice = await createSakurupiahInvoice({
      merchantRef,
      amount,
      buyerName: profile.username,
      produkLabel: 'Top-up Diamond'
    });

    if (!invoice.ok) {
      return NextResponse.json({ error: invoice.error ?? 'Gagal membuat invoice pembayaran' }, { status: 502 });
    }

    // Row "pending" ini yang bakal diupdate otomatis sama webhook
    // sakurupiah-callback pas pembayaran sukses -- sama persis kayak
    // transaksi top-up dari app Android.
    const { error: insertErr } = await supabaseAdmin.from('diamond_topups').insert({
      user_id: profile.id,
      amount_rupiah: amount,
      diamond_amount: diamondAmount,
      payment_ref: merchantRef,
      payment_trx_id: invoice.trxId,
      payment_checkout_url: invoice.checkoutUrl,
      payment_status: 'pending',
      status: 'pending'
    });

    if (insertErr) {
      console.error('Failed to insert diamond_topups row:', insertErr);
      return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
    }

    return NextResponse.json({
      merchant_ref: merchantRef,
      qr: invoice.qr,
      checkout_url: invoice.checkoutUrl,
      diamond_amount: diamondAmount,
      username: profile.username
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
