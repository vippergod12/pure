import { sql } from '@/lib/server/db';
import { jsonOk } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

const TRENDING_LIMIT = 24;
const FEATURED_LIMIT = 12;

/**
 * Endpoint gộp dữ liệu cho trang chủ.
 *
 * Chạy 4 query Postgres song song trong cùng 1 function instance,
 * trả tất cả trong một response → user chỉ chịu 1 cold start, 1 round trip.
 */
export async function GET() {
  const [categories, products, featured, heroRows] = await Promise.all([
    sql`
      SELECT c.id, c.name, c.slug, c.image_url, c.description, c.created_at, c.updated_at,
             (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c
      ORDER BY c.name ASC
    `,
    sql`
      SELECT p.id, p.category_id, p.name, p.slug, p.price,
             p.sale_price, p.sale_end_at,
             p.image_url, p.colors,
             p.is_active, p.is_hero, p.featured_rank,
             p.created_at, p.updated_at,
             c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ORDER BY p.is_active DESC, p.created_at DESC
      LIMIT ${TRENDING_LIMIT}
    `,
    sql`
      SELECT p.id, p.category_id, p.name, p.slug, p.price,
             p.sale_price, p.sale_end_at,
             p.image_url, p.colors,
             p.is_active, p.featured_rank,
             p.created_at, p.updated_at,
             c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.featured_rank IS NOT NULL
      ORDER BY p.featured_rank ASC
      LIMIT ${FEATURED_LIMIT}
    `,
    sql`
      SELECT p.id, p.category_id, p.name, p.slug, p.price,
             p.sale_price, p.sale_end_at,
             p.image_url, p.colors,
             p.is_active, p.is_hero, p.featured_rank,
             p.created_at, p.updated_at,
             c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_hero = TRUE
      LIMIT 1
    `,
  ]);

  return jsonOk(
    {
      categories,
      products,
      featured,
      hero: (heroRows as Record<string, unknown>[])[0] ?? null,
    },
    { cache: 'public', cacheOpts: { sMaxAge: 60, staleWhileRevalidate: 300 } },
  );
}
