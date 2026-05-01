import type { Product } from '../types';

export interface SaleInfo {
  isOnSale: boolean;
  effectivePrice: number;
  originalPrice: number;
  salePrice: number | null;
  saleEndAt: Date | null;
  /**
   * Discount % theo công thức yêu cầu: (sale_price * 100) / original_price
   * → ví dụ original 100k, sale 60k → 60%
   */
  saleRatio: number;
  /** Discount % thông dụng: (1 - sale/original) * 100 → ví dụ 100k → 60k = 40% off */
  discountPercent: number;
}

export function getSaleInfo(product: Pick<Product, 'price' | 'sale_price' | 'sale_end_at'>): SaleInfo {
  const original = Number(product.price) || 0;
  const sale = product.sale_price != null ? Number(product.sale_price) : null;
  const endAt = product.sale_end_at ? new Date(product.sale_end_at) : null;

  const validEnd = endAt && !Number.isNaN(endAt.getTime()) && endAt.getTime() > Date.now();
  const validSale = sale != null && sale > 0 && sale < original;
  const isOnSale = !!(validSale && validEnd);

  const effectivePrice = isOnSale ? (sale as number) : original;
  const ratio = isOnSale ? Math.round(((sale as number) * 100) / original) : 0;
  const discount = isOnSale ? Math.round((1 - (sale as number) / original) * 100) : 0;

  return {
    isOnSale,
    effectivePrice,
    originalPrice: original,
    salePrice: sale,
    saleEndAt: endAt,
    saleRatio: ratio,
    discountPercent: discount,
  };
}

/** Format datetime ISO string sang `YYYY-MM-DDTHH:mm` cho input datetime-local */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local value back to ISO string (UTC) */
export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
