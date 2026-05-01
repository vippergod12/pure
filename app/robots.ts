import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/siteConfig';

/**
 * robots.txt động — Next.js phục vụ tại GET /robots.txt.
 * Chặn /admin và /api khỏi crawl, trỏ sitemap chuẩn.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
