import type { MetadataRoute } from 'next';
import { fetchCategories, fetchProducts } from '@/lib/data';
import { absoluteUrl } from '@/lib/seo/siteConfig';

/**
 * Sitemap động cho Google / Bing / Cốc Cốc.
 * Next.js sẽ phục vụ tại GET /sitemap.xml.
 *
 * Cache theo ISR 1 giờ (sitemap không cần realtime, vẫn đủ tươi).
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  try {
    const [categories, products] = await Promise.all([
      fetchCategories().catch(() => []),
      fetchProducts({}).catch(() => []),
    ]);

    const routes: MetadataRoute.Sitemap = [
      {
        url: absoluteUrl('/'),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: absoluteUrl('/cua-hang'),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.9,
      },
    ];

    for (const c of categories) {
      routes.push({
        url: absoluteUrl(`/danh-muc/${c.slug}`),
        lastModified: c.updated_at ? new Date(c.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const p of products) {
      if (!p.is_active) continue;
      routes.push({
        url: absoluteUrl(`/san-pham/${p.slug}`),
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    return routes;
  } catch {
    // Khi DB lỗi vẫn trả về sitemap tối thiểu để không bị 500.
    return [
      { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1.0 },
      { url: absoluteUrl('/cua-hang'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ];
  }
}
