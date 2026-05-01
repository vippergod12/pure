/**
 * Build URL Zalo chat từ env config.
 *
 * Trên Next.js, biến phải có prefix `NEXT_PUBLIC_` để có mặt trong client bundle.
 * Vẫn fallback về VITE_* để giữ tương thích nếu user đã set sẵn từ thời Vite.
 */
const RAW_PHONE = (
  process.env.NEXT_PUBLIC_ZALO_PHONE ??
  process.env.VITE_ZALO_PHONE ??
  ''
)
  .toString()
  .trim();
const RAW_URL = (
  process.env.NEXT_PUBLIC_ZALO_URL ??
  process.env.VITE_ZALO_URL ??
  ''
)
  .toString()
  .trim();

function normalizePhone(phone: string): string {
  // Bỏ khoảng trắng, dấu chấm, dấu cách, prefix +84
  const cleaned = phone.replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+84')) return '0' + cleaned.slice(3);
  if (cleaned.startsWith('84') && cleaned.length === 11) return '0' + cleaned.slice(2);
  return cleaned;
}

export const ZALO_PHONE = RAW_PHONE ? normalizePhone(RAW_PHONE) : '';

export const ZALO_URL: string = (() => {
  if (RAW_URL) return RAW_URL;
  if (ZALO_PHONE) return `https://zalo.me/${ZALO_PHONE}`;
  return '';
})();

export const ZALO_ENABLED = Boolean(ZALO_URL);
