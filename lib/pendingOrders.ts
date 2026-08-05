'use client';

// Nyimpen daftar transaksi manual yang lagi pending DI DEVICE/BROWSER INI
// aja (localStorage) -- biar kalau user ketutup tab sebelum kirim bukti,
// pas balik lagi ke /lanjutkan bisa muncul otomatis, gak perlu apal/paste
// kode lanjutan manual. Ini cuma buffer kenyamanan, BUKAN sumber otorisasi
// -- yang tetep jadi kunci akses ke /api/manual-proof adalah proof_token
// yang ikut disimpen di sini.
const STORAGE_KEY = 'aniku_pending_orders';

export interface PendingOrder {
  resumeCode: string;
  type: 'diamond' | 'premium';
  label: string;
  amount: number;
  username?: string;
  created_at: string;
}

export function savePendingOrder(order: PendingOrder) {
  try {
    const list = loadPendingOrders();
    const next = [order, ...list.filter((o) => o.resumeCode !== order.resumeCode)].slice(0, 10);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage gak ada/gak bisa diakses (misal private mode) -- gapapa,
    // fitur ini emang cuma kenyamanan tambahan.
  }
}

export function loadPendingOrders(): PendingOrder[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function removePendingOrder(resumeCode: string) {
  try {
    const list = loadPendingOrders().filter((o) => o.resumeCode !== resumeCode);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // no-op
  }
}
