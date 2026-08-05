export interface PremiumPackage {
  id: string;
  label: string;
  duration_days: number;
  price: number;
  is_active: boolean | null;
  bonus_diamond: number | null;
}

export interface CheckoutResponse {
  claim_id?: string;
  merchant_ref?: string;
  qr: string | null;
  checkout_url: string | null;
  username?: string;
  error?: string;
}

export interface StatusResponse {
  status: string; // 'pending' | 'ready' | 'claimed' | 'credited' | dst
  error?: string;
}

// --- Manual QRIS (buat pembeli luar negeri, misal Malaysia) ---

export interface ManualCheckoutResponse {
  claim_id?: string; // premium_claims.id
  merchant_ref?: string; // dipake sebagai id buat diamond_topups
  amount?: number;
  diamond_amount?: number;
  username?: string;
  error?: string;
}

export interface ManualPaymentItem {
  type: 'premium' | 'diamond';
  id: string;
  merchant_ref: string;
  username: string;
  label: string;
  amount: number;
  manual_proof_url: string | null;
  manual_note: string | null;
  created_at: string;
}
