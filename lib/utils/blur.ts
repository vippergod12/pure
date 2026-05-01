/**
 * Blur placeholder dùng cho `next/image placeholder="blur" blurDataURL={...}`.
 *
 * Vì ảnh sản phẩm load từ Unsplash CDN ngoài, không thể generate blurDataURL
 * tự động lúc build. Dùng SVG tone neutral (cream + emerald nhẹ) làm
 * placeholder — kích thước ~120 byte, hợp với theme của shop.
 */

const SHIMMER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#efe9da"/>
      <stop offset="100%" stop-color="#d8d2c3"/>
    </linearGradient>
  </defs>
  <rect width="16" height="16" fill="url(#g)"/>
</svg>`.replace(/\n\s*/g, '');

function toBase64(str: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  return window.btoa(str);
}

/** Placeholder mặc định — dùng cho mọi ảnh sản phẩm. */
export const DEFAULT_BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(SHIMMER_SVG)}`;
