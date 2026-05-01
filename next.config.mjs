/**
 * Next.js config — thay thế hoàn toàn vite.config.ts
 *
 * Lưu ý:
 *  - `images.remotePatterns`: cho phép `next/image` tải ảnh từ host bên ngoài
 *    (Cloudinary, CDN, etc). Mặc định mở tất cả `https://**` để dễ bắt đầu —
 *    sau khi xác định CDN cố định, hãy giới hạn lại để tránh hot-link lung tung.
 *  - Vercel root `/api/*` functions vẫn được build cùng project (Vercel auto detect).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    // Cache ảnh đã optimize 24h ở cả dev & prod để tránh
    // bị Unsplash rate-limit (429) khi reload nhiều lần.
    minimumCacheTTL: 60 * 60 * 24,
  },
  experimental: {
    optimizePackageImports: ['swiper'],
  },
};

export default nextConfig;
