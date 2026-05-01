'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { formatVnd } from '@/lib/utils/format';
import { getSaleInfo } from '@/lib/utils/sale';
import { ZALO_ENABLED, ZALO_URL } from '@/lib/utils/zalo';

interface Props {
  product: Product;
}

function buildZaloMessage(
  product: Product,
  price: number,
  color: string | null,
): string {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  return [
    `Xin chào shop, mình muốn mua sản phẩm:`,
    `• ${product.name}`,
    color ? `• Màu: ${color}` : '',
    `• Giá: ${formatVnd(price)}`,
    url ? `• Link: ${url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function handleZaloContact(
  product: Product,
  price: number,
  color: string | null,
) {
  const message = buildZaloMessage(product, price, color);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(message);
    }
  } catch {
    /* bỏ qua nếu clipboard bị chặn */
  }
  window.open(ZALO_URL, '_blank', 'noopener,noreferrer');
}

/**
 * Khối CTA tương tác cho trang chi tiết sản phẩm:
 *  - Chọn màu sắc
 *  - Nút "Liên hệ Zalo" (copy nội dung vào clipboard rồi mở Zalo)
 *  - Mobile sticky CTA bar ở dưới cùng màn hình
 *
 * Tách riêng thành Client Component để giữ trang chi tiết là Server Component
 * (cho SSR/ISR + SEO tối đa).
 */
export default function ProductDetailCta({ product }: Props) {
  const sale = useMemo(() => getSaleInfo(product), [product]);
  const [selectedColor, setSelectedColor] = useState<string | null>(() =>
    Array.isArray(product.colors) && product.colors.length === 1
      ? product.colors[0]
      : null,
  );

  return (
    <>
      {product.colors && product.colors.length > 0 && (
        <div className="variant-block">
          <div className="variant-label">
            <span>Màu sắc</span>
            {selectedColor && <em>{selectedColor}</em>}
          </div>
          <div className="variant-options">
            {product.colors.map((c) => (
              <button
                type="button"
                key={c}
                className={`variant-chip ${selectedColor === c ? 'is-selected' : ''}`}
                onClick={() => setSelectedColor(selectedColor === c ? null : c)}
                disabled={!product.is_active}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.is_active && ZALO_ENABLED ? (
        <div className="product-detail-cta">
          <button
            type="button"
            className="btn-zalo"
            onClick={() => handleZaloContact(product, sale.effectivePrice, selectedColor)}
            aria-label="Liên hệ shop qua Zalo để mua"
          >
            <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M32 6C16.5 6 4 16.7 4 30c0 7 3.5 13.3 9.2 17.6-.5 2.5-1.7 5.7-4 8 .3.4.8.6 1.4.5 4.3-.5 8.5-2.2 11.5-3.7 3.2.9 6.5 1.4 9.9 1.4 15.5 0 28-10.7 28-24S47.5 6 32 6zm-9.6 28.7h-6.7c-.6 0-1-.4-1-1v-9.5c0-.6.4-1 1-1s1 .4 1 1v8.5h5.7c.6 0 1 .4 1 1s-.4 1-1 1zm5-1c0 .6-.4 1-1 1s-1-.4-1-1v-9.5c0-.6.4-1 1-1s1 .4 1 1v9.5zm9.4 0c0 .6-.4 1-1 1-.3 0-.6-.2-.8-.4l-5-6.6v6c0 .6-.4 1-1 1s-1-.4-1-1v-9.5c0-.6.4-1 1-1 .3 0 .6.2.8.4l5 6.6v-6c0-.6.4-1 1-1s1 .4 1 1v9.5zm10.6 0c0 .3-.2.6-.4.8-.2.2-.4.3-.6.3h-6c-.6 0-1-.4-1-1v-9.5c0-.6.4-1 1-1s1 .4 1 1v8.5h5c.6 0 1 .4 1 .9z"
              />
            </svg>
            Liên hệ ngay để được tư vấn
          </button>
          <span className="product-detail-cta-hint">
            {selectedColor
              ? `Đang chọn màu: ${selectedColor} — thông tin đã copy vào clipboard.`
              : 'Bấm để mở Zalo — thông tin sản phẩm đã được copy vào clipboard.'}
          </span>
        </div>
      ) : !product.is_active ? (
        <div className="product-detail-cta">
          <button type="button" className="btn-zalo is-disabled" disabled>
            Sản phẩm tạm hết hàng
          </button>
          <span className="product-detail-cta-hint">
            Vui lòng quay lại sau hoặc xem các sản phẩm tương tự bên dưới.
          </span>
        </div>
      ) : null}

      {product.is_active && ZALO_ENABLED && (
        <div className="mobile-cta-bar" role="region" aria-label="Liên hệ mua hàng">
          <div className="mobile-cta-bar-price">
            {sale.isOnSale ? (
              <>
                <span className="mobile-cta-bar-sale">{formatVnd(sale.effectivePrice)}</span>
                <span className="mobile-cta-bar-strike">{formatVnd(sale.originalPrice)}</span>
              </>
            ) : (
              <span className="mobile-cta-bar-sale">{formatVnd(product.price)}</span>
            )}
          </div>
          <button
            type="button"
            className="btn-zalo mobile-cta-bar-btn"
            onClick={() => handleZaloContact(product, sale.effectivePrice, selectedColor)}
            aria-label="Liên hệ shop qua Zalo để mua"
          >
            <svg viewBox="0 0 64 64" width="20" height="20" aria-hidden>
              <path
                fill="currentColor"
                d="M32 6C16.5 6 4 16.7 4 30c0 7 3.5 13.3 9.2 17.6-.5 2.5-1.7 5.7-4 8 .3.4.8.6 1.4.5 4.3-.5 8.5-2.2 11.5-3.7 3.2.9 6.5 1.4 9.9 1.4 15.5 0 28-10.7 28-24S47.5 6 32 6zm-9.6 28.7h-6.7c-.6 0-1-.4-1-1v-9.5c0-.6.4-1 1-1s1 .4 1 1v8.5h5.7c.6 0 1 .4 1 1s-.4 1-1 1zm5-1c0 .6-.4 1-1 1s-1-.4-1-1v-9.5c0-.6.4-1 1-1s1 .4 1 1v9.5zm9.4 0c0 .6-.4 1-1 1-.3 0-.6-.2-.8-.4l-5-6.6v6c0 .6-.4 1-1 1s-1-.4-1-1v-9.5c0-.6.4-1 1-1 .3 0 .6.2.8.4l5 6.6v-6c0-.6.4-1 1-1s1 .4 1 1v9.5zm10.6 0c0 .3-.2.6-.4.8-.2.2-.4.3-.6.3h-6c-.6 0-1-.4-1-1v-9.5c0-.6.4-1 1-1s1 .4 1 1v8.5h5c.6 0 1 .4 1 .9z"
              />
            </svg>
            <span>Mua qua Zalo</span>
          </button>
        </div>
      )}
    </>
  );
}
