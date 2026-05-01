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
