// "Kode lanjutan" -- dipakai buat fitur lanjutin pembayaran manual yang
// ketutup/kepending di tengah jalan (misal browser ketutup sebelum kirim
// bukti bayar).
//
// PENTING SOAL KEAMANAN: kode ini WAJIB ngandung proof_token, bukan cuma
// ref/id transaksi. Kalau cuma ref/id doang (misal "MANUAL-DMD-XXXX-...")
// yang dianggap cukup buat lanjutin, itu balik lagi jadi celah IDOR yang
// udah kita patch di /api/manual-proof -- soalnya ref/id transaksi orang
// lain bisa keliatan lewat /api/transactions. Makanya token WAJIB ada di
// kode ini, dan token itu CUMA dikasih sekali pas checkout (gak bisa
// "diambil ulang" cuma modal ref).
//
// Format: "<type>:<id>:<token>"
// - type  : 'diamond' | 'premium'
// - id    : id yang dipake /api/manual-proof & /api/status
//           (merchant_ref buat diamond, claim_id buat premium)
// - token : proof_token dari response checkout
export type ResumeType = 'diamond' | 'premium';

export interface ResumePayload {
  type: ResumeType;
  id: string;
  token: string;
}

export function buildResumeCode(payload: ResumePayload): string {
  return `${payload.type}:${payload.id}:${payload.token}`;
}

export function parseResumeCode(raw: string): ResumePayload | null {
  const trimmed = raw.trim();
  const parts = trimmed.split(':');
  if (parts.length !== 3) return null;
  const [type, id, token] = parts;
  if (type !== 'diamond' && type !== 'premium') return null;
  if (!id || !token) return null;
  return { type, id, token };
}
