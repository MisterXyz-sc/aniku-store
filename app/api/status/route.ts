import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dipoll dari frontend tiap 4 detik selagi nunggu pembayaran.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const id = req.nextUrl.searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ status: 'unknown', error: 'Parameter kurang' }, { status: 400 });
  }

  if (type === 'premium') {
    const { data, error } = await supabaseAdmin
      .from('premium_claims')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ status: 'unknown' });
    return NextResponse.json({ status: data.status });
  }

  if (type === 'diamond') {
    const { data, error } = await supabaseAdmin
      .from('diamond_topups')
      .select('status')
      .eq('merchant_ref', id)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ status: 'unknown' });
    return NextResponse.json({ status: data.status });
  }

  return NextResponse.json({ status: 'unknown', error: 'Tipe gak dikenal' }, { status: 400 });
}
