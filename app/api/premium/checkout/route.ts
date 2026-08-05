import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSakurupiahInvoice } from '@/lib/sakurupiah';

export async function POST(req: NextRequest) {
  try {
    const { username, package_id } = await req.json();

    if (!username || !package_id) {
      return NextResponse.json({ error: 'Username dan paket wajib diisi' }, { status: 400 });
    }

    // 1. Cari user berdasarkan username
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Username gak ditemukan di Aniku' }, { status: 404 });
    }

    // 2. Ambil detail paket
    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from('premium_packages')
      .select('*')
      .eq('id', package_id)
      .eq('is_active', true)
      .maybeSingle();

    if (pkgErr || !pkg) {
      return NextResponse.json({ error: 'Paket gak ditemukan atau gak aktif' }, { status: 404 });
    }

    // 3. Bikin claim langsung (service role bypass RLS, gak butuh auth.uid())
    //    -- claim_type "direct" & target_user_id = diri sendiri, sama kayak
    //    "Beli Premium" self-purchase di app.
    const code = 'ANK-' + Math.random().toString(16).slice(2, 8).toUpperCase();
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
        status: 'pending'
      })
      .select()
      .single();

    if (claimErr || !claim) {
      console.error('Failed to create premium_claims row:', claimErr);
      return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 });
    }

    // 4. Generate invoice QRIS ke Sakurupiah -- format request PERSIS sama
    //    kayak Edge Function sakurupiah-create-invoice yang dipakai app.
    const merchantRef = `${claim.code}-${Date.now()}`;

    const invoice = await createSakurupiahInvoice({
      merchantRef,
      amount: pkg.price,
      buyerName: profile.username,
      produkLabel: pkg.label
    });

    if (!invoice.ok) {
      // Bersihin claim yang gagal dapet invoice, biar gak numpuk row "pending" nyasar
      await supabaseAdmin.from('premium_claims').delete().eq('id', claim.id);
      return NextResponse.json({ error: invoice.error ?? 'Gagal membuat invoice pembayaran' }, { status: 502 });
    }

    // 5. Simpan info pembayaran ke claim -- webhook sakurupiah-callback yang
    //    udah ada bakal otomatis update status-nya begitu pembayaran sukses,
    //    sama persis kayak transaksi dari app Android.
    const { error: updateErr } = await supabaseAdmin
      .from('premium_claims')
      .update({
        payment_ref: merchantRef,
        payment_trx_id: invoice.trxId,
        payment_checkout_url: invoice.checkoutUrl
      })
      .eq('id', claim.id);

    if (updateErr) {
      console.error('Failed to save payment info on claim:', updateErr);
      return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
    }

    return NextResponse.json({
      claim_id: claim.id,
      qr: invoice.qr,
      checkout_url: invoice.checkoutUrl,
      merchant_ref: merchantRef
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
