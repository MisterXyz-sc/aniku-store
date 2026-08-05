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
  error?: string;
}

export interface StatusResponse {
  status: string; // 'pending' | 'ready' | 'claimed' | 'credited' | dst
  error?: string;
}
