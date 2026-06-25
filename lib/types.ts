export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  product_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  sale_end_at: string | null;
  image_url: string | null;
  colors: string[];
  is_active: boolean;
  is_hero: boolean;
  featured_rank: number | null;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
  category_slug?: string;
}

export interface AdminUser {
  sub: number;
  username: string;
}

export interface LoginResponse {
  token: string;
  admin: { id: number; username: string };
}

export interface ApiError {
  message: string;
}

export type ConsultationGender = 'male' | 'female' | 'other' | null;
export type ConsultationStatus = 'new' | 'contacted';

export interface Consultation {
  id: number;
  name: string | null;
  gender: ConsultationGender;
  phone: string;
  note: string | null;
  status: ConsultationStatus;
  contacted_at: string | null;
  source_ip: string | null;
  created_at: string;
}

export type OrderStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'awaiting_transfer'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'amount_mismatch';

export interface OrderProductSnapshot {
  id?: number;
  name?: string;
  slug?: string;
  image_url?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  unit_price?: number;
  original_price?: number;
  sale_price?: number | null;
}

export interface Order {
  id: number;
  order_code: string;
  product_id: number | null;
  product_snapshot: OrderProductSnapshot;
  selected_color: string | null;
  quantity: number;
  amount: number;
  currency: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string | null;
  payment_provider: string;
  payment_method: string;
  bank_code: string | null;
  payment_url: string | null;
  provider_transaction_id: string | null;
  status: OrderStatus | string;
  appotapay_status: string | null;
  appotapay_error_code: number | null;
  appotapay_error_message: string | null;
  appotapay_payload: unknown;
  momo_result_code: number | null;
  momo_message: string | null;
  momo_pay_type: string | null;
  momo_request_id: string | null;
  momo_payload: unknown;
  admin_note: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
