import { formatDate, formatVnd } from '@/lib/utils/format';
import { getSaleInfo } from '@/lib/utils/sale';
import type { Product } from '@/lib/types';

interface Props {
  product: Pick<Product, 'price' | 'sale_price' | 'sale_end_at'>;
  variant?: 'badge' | 'inline';
  /**
   * 'ratio': dùng công thức (sale_price * 100) / original_price → ví dụ 60k/100k = "60%"
   * 'discount': giảm bao nhiêu % → ví dụ giảm "40%"
   * Mặc định 'ratio' theo yêu cầu user.
   */
  mode?: 'discount' | 'ratio';
  className?: string;
}

export function SaleBadge({ product, variant = 'badge', mode = 'ratio', className = '' }: Props) {
  const info = getSaleInfo(product);
  if (!info.isOnSale) return null;

  const value = mode === 'ratio' ? info.saleRatio : info.discountPercent;
  const label = mode === 'ratio' ? `SALE ${value}%` : `-${value}%`;

  if (variant === 'inline') {
    return <span className={`sale-pill ${className}`}>{label}</span>;
  }
  return <span className={`sale-badge ${className}`}>{label}</span>;
}

interface PriceDisplayProps {
  product: Pick<Product, 'price' | 'sale_price' | 'sale_end_at'>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Hiển thị ngày kết thúc sale dạng "đến DD/MM/YYYY" — bố cục grid 2 hàng */
  showEndDate?: boolean;
}

export function PriceDisplay({
  product,
  className = '',
  size = 'md',
  showEndDate = false,
}: PriceDisplayProps) {
  const info = getSaleInfo(product);
  if (!info.isOnSale) {
    return <span className={`price price-${size} ${className}`}>{formatVnd(info.originalPrice)}</span>;
  }
  return (
    <span className={`price-group price-${size} ${className}`}>
      <span className="price-original">{formatVnd(info.originalPrice)}</span>
      <span className="price-sale">{formatVnd(info.effectivePrice)}</span>
      {showEndDate && info.saleEndAt && (
        <span className="price-end">đến {formatDate(info.saleEndAt)}</span>
      )}
    </span>
  );
}
