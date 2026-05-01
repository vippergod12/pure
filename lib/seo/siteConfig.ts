/**
 * Cấu hình trung tâm cho SEO của toàn site.
 *
 * Đặt NEXT_PUBLIC_SITE_URL trong `.env` (ví dụ `https://pure.vn`) để các
 * thẻ canonical / Open Graph / sitemap dùng đúng domain production.
 *
 * Khi deploy lên Vercel, fallback dùng VERCEL_URL được set tự động.
 */

/** Kiểm tra một chuỗi có phải URL tuyệt đối hợp lệ không. */
function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Quyết định domain của site.
 *
 * Defensive: nếu env vars bị set sai (ví dụ trên Vercel ai đó dán nhầm tên
 * biến vào ô Value), KHÔNG để build crash — bỏ qua giá trị invalid và
 * fallback về VERCEL_URL hoặc localhost.
 */
function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VITE_SITE_URL,
  ];

  for (const raw of candidates) {
    const v = raw?.trim();
    if (v && isValidUrl(v)) return v.replace(/\/$/, '');
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const withScheme = `https://${vercelUrl.replace(/\/$/, '')}`;
    if (isValidUrl(withScheme)) return withScheme;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = 'PURE';

export const SITE_TAGLINE = 'Tinh hoa đá quý — Tôn vinh vẻ đẹp thuần khiết';

export const SITE_DESCRIPTION =
  'PURE — chuyên trang sức đá quý cao cấp: ngọc lục bảo (emerald), ruby, sapphire, kim cương, ngọc trai và bạc 925. Mỗi thiết kế là một tác phẩm thủ công, mang vẻ đẹp tinh khiết của thiên nhiên đến gần bạn.';

export const SITE_LOCALE = 'vi_VN';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

/** Tạo URL tuyệt đối từ path tương đối (đảm bảo có domain). */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
