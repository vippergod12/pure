// Data fetcher cho Server Components.
//
// Server Components query DB trực tiếp qua `@neondatabase/serverless` —
// không hop qua HTTP `/api/...`. Lý do:
//   1. Nhanh hơn: bỏ qua JSON serialize/parse + một round trip mạng.
//   2. Không phụ thuộc dev server tự gọi chính nó (`next build` không cần
//      `localhost:3000` đang chạy).
//   3. ISR vẫn hoạt động tốt: Next.js cache RSC output theo `revalidate` ở
//      page level (`export const revalidate = 60`).
//
// Admin client (browser) vẫn dùng `lib/api-client.ts` để gọi route handlers
// trong `app/api/[...]/route.ts` — đây mới là lúc cần HTTP layer + JWT auth.

import { sql } from './server/db';
import type { Category, Product } from './types';

const TRENDING_LIMIT = 24;
const FEATURED_LIMIT = 12;
const RELATED_LIMIT = 12;
const PRODUCT_LIST_LIMIT = 60;

export type HomeBundle = {
  categories: Category[];
  products: Product[];
  featured: Product[];
  hero: Product | null;
};

export type ProductDetailBundle = {
  product: Product;
  related?: Product[];
  featured?: Product[];
};

export async function fetchHome(): Promise<HomeBundle> {
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

  return {
    categories: categories as unknown as Category[],
    products: products as unknown as Product[],
    featured: featured as unknown as Product[],
    hero: ((heroRows as unknown as Product[])[0] ?? null) as Product | null,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const rows = await sql`
    SELECT c.id, c.name, c.slug, c.image_url, c.description, c.created_at, c.updated_at,
           (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c
    ORDER BY c.name ASC
  `;
  return rows as unknown as Category[];
}

export async function fetchCategory(slug: string): Promise<Category | null> {
  const rows = (await sql`
    SELECT id, name, slug, image_url, description, created_at, updated_at
    FROM categories
    WHERE slug = ${slug}
    LIMIT 1
  `) as unknown as Category[];
  return rows[0] ?? null;
}

export async function fetchProducts(
  params: { category?: string; q?: string } = {},
): Promise<Product[]> {
  const categoryRaw = params.category?.trim();
  const search = (params.q ?? '').trim();

  const categoryId = categoryRaw && /^\d+$/.test(categoryRaw) ? Number(categoryRaw) : null;
  const categorySlug = categoryRaw && !categoryId ? categoryRaw : null;
  const searchTerm = search ? `%${search}%` : null;

  const rows = await sql`
    SELECT p.id, p.category_id, p.name, p.slug, p.price,
           p.sale_price, p.sale_end_at,
           p.image_url, p.colors,
           p.is_active, p.is_hero, p.featured_rank,
           p.created_at, p.updated_at,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE (${categoryId}::int IS NULL OR p.category_id = ${categoryId}::int)
      AND (${categorySlug}::text IS NULL OR c.slug = ${categorySlug}::text)
      AND (${searchTerm}::text IS NULL OR p.name ILIKE ${searchTerm}::text)
    ORDER BY p.is_active DESC, p.created_at DESC
    LIMIT ${PRODUCT_LIST_LIMIT}
  `;
  return rows as unknown as Product[];
}

export async function fetchProductDetail(slug: string): Promise<ProductDetailBundle | null> {
  const rows = (await sql`
    SELECT p.id, p.category_id, p.name, p.slug, p.description, p.price,
           p.sale_price, p.sale_end_at,
           p.image_url, p.colors,
           p.is_active, p.is_hero, p.featured_rank,
           p.created_at, p.updated_at,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ${slug}
    LIMIT 1
  `) as unknown as Product[];
  const product = rows[0];
  if (!product) return null;

  const [related, featured] = await Promise.all([
    sql`
      SELECT p.id, p.category_id, p.name, p.slug, p.price,
             p.sale_price, p.sale_end_at,
             p.image_url, p.colors,
             p.is_active, p.is_hero, p.featured_rank,
             p.created_at, p.updated_at,
             c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.category_id = ${product.category_id}
        AND p.id <> ${product.id}
      ORDER BY p.is_active DESC, p.created_at DESC
      LIMIT ${RELATED_LIMIT}
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
        AND p.id <> ${product.id}
      ORDER BY p.featured_rank ASC
      LIMIT ${FEATURED_LIMIT}
    `,
  ]);

  return {
    product,
    related: related as unknown as Product[],
    featured: featured as unknown as Product[],
  };
}
