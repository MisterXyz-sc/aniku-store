// Aniku Store (Vercel) manggil Sakurupiah LEWAT proxy edge function di VPS,
// bukan langsung -- soalnya Sakurupiah pakai IP whitelist dan Vercel gak
// punya IP outbound tetap. Proxy-nya jalan di VPS (IP udah di-whitelist)
// dan diproteksi shared-secret (STORE_PROXY_SECRET), bukan auth user.

const STORE_PROXY_URL = 'https://203-175-11-166.nip.io/functions/v1/sakurupiah-store-proxy';
const STORE_PROXY_SECRET = process.env.STORE_PROXY_SECRET!;

export interface SakurupiahInvoiceResult {
  ok: boolean;
  trxId?: string;
  checkoutUrl?: string;
  qr?: string | null;
  error?: string;
}

// Bikin invoice QRIS ke Sakurupiah lewat proxy VPS. `merchantRef` &
// `produkLabel` beda-beda tergantung Premium atau Diamond.
export async function createSakurupiahInvoice(params: {
  merchantRef: string;
  amount: number;
  buyerName: string;
  produkLabel: string;
  method?: string;
}): Promise<SakurupiahInvoiceResult> {
  if (!STORE_PROXY_SECRET) {
    return { ok: false, error: 'STORE_PROXY_SECRET belum diisi di environment variables' };
  }

  try {
    const res = await fetch(STORE_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-secret': STORE_PROXY_SECRET
      },
      body: JSON.stringify(params)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      console.error('Sakurupiah proxy error:', JSON.stringify(json));
      return { ok: false, error: json.error || 'Gagal membuat invoice pembayaran ke Sakurupiah' };
    }

    return {
      ok: true,
      trxId: json.trxId,
      checkoutUrl: json.checkoutUrl,
      qr: json.qr ?? null
    };
  } catch (e) {
    console.error('Sakurupiah proxy request failed:', e);
    return { ok: false, error: 'Gagal menghubungi server pembayaran' };
  }
}
