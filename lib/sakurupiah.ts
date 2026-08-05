// Helper buat manggil API Sakurupiah langsung dari server (Vercel API route),
// polanya disamain PERSIS kayak Edge Function sakurupiah-create-invoice /
// sakurupiah-create-diamond-invoice yang udah jalan di Supabase.

const API_ID = process.env.SAKURUPIAH_API_ID!;
const API_KEY = process.env.SAKURUPIAH_API_KEY!;
const IS_PRODUCTION = process.env.SAKURUPIAH_IS_PRODUCTION === 'true';

export const SAKURUPIAH_BASE_URL = IS_PRODUCTION
  ? 'https://sakurupiah.id/api'
  : 'https://sakurupiah.id/api-sanbox';

// URL callback webhook yang SAMA kayak dipakai app Android -- biar
// pembayaran dari website ini tetap diproses lewat webhook yang udah ada.
export const SAKURUPIAH_CALLBACK_URL = 'https://203-175-11-166.nip.io/functions/v1/sakurupiah-callback';

export async function hmacSha256Hex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface SakurupiahInvoiceResult {
  ok: boolean;
  trxId?: string;
  checkoutUrl?: string;
  qr?: string | null;
  error?: string;
}

// Bikin invoice QRIS ke Sakurupiah. `merchantRef` & `produkLabel` beda-beda
// tergantung Premium atau Diamond, tapi request-nya sama persis strukturnya.
export async function createSakurupiahInvoice(params: {
  merchantRef: string;
  amount: number;
  buyerName: string;
  produkLabel: string;
  method?: string;
}): Promise<SakurupiahInvoiceResult> {
  if (!API_ID || !API_KEY) {
    return { ok: false, error: 'SAKURUPIAH_API_ID / SAKURUPIAH_API_KEY belum diisi di environment variables' };
  }

  const dataMethod = params.method ?? 'QRIS';
  const amountStr = String(params.amount);
  const signature = await hmacSha256Hex(API_ID + dataMethod + params.merchantRef + amountStr, API_KEY);

  const form = new URLSearchParams();
  form.set('api_id', API_ID);
  form.set('method', dataMethod);
  form.set('name', params.buyerName || 'User Aniku');
  form.set('email', 'noemail@aniku.app');
  form.set('phone', '628000000000');
  form.set('amount', amountStr);
  form.set('merchant_fee', '1');
  form.set('merchant_ref', params.merchantRef);
  form.set('expired', '24');
  form.set('produk[]', params.produkLabel);
  form.set('qty[]', '1');
  form.set('harga[]', amountStr);
  form.set('callback_url', SAKURUPIAH_CALLBACK_URL);
  form.set('return_url', 'https://www.app-aniku.web.id/payment-finish');
  form.set('signature', signature);

  try {
    const res = await fetch(`${SAKURUPIAH_BASE_URL}/create.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${API_KEY}`
      },
      body: form.toString()
    });

    const json = await res.json();

    if (json.status !== '200' || !json.data?.[0]) {
      console.error('Sakurupiah create invoice error:', JSON.stringify(json));
      return { ok: false, error: 'Gagal membuat invoice pembayaran ke Sakurupiah' };
    }

    const data = json.data[0];
    const checkoutUrl = (data.checkout_url ?? data.qr ?? '') as string;

    return {
      ok: true,
      trxId: data.trx_id as string,
      checkoutUrl,
      qr: data.qr ?? null
    };
  } catch (e) {
    console.error('Sakurupiah request failed:', e);
    return { ok: false, error: 'Gagal menghubungi Sakurupiah' };
  }
}
