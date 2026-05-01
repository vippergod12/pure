import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import { badRequest, jsonOk, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FEATURED = 12;

export async function GET() {
  const rows = await sql`
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
    LIMIT ${MAX_FEATURED}
  `;
  return jsonOk(rows, {
    cache: 'public',
    cacheOpts: { sMaxAge: 120, staleWhileRevalidate: 600 },
  });
}

export async function PUT(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauthorized();

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const rawIds = Array.isArray(body.ids) ? body.ids : [];

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const v of rawIds) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    ids.push(n);
    if (ids.length >= MAX_FEATURED) break;
  }

  if (ids.length === 0) {
    await sql`UPDATE products SET featured_rank = NULL WHERE featured_rank IS NOT NULL`;
    return jsonOk({ count: 0, ids: [] }, { cache: 'no-store' });
  }

  const existing = (await sql`
    SELECT id FROM products WHERE id = ANY(${ids}::int[])
  `) as { id: number }[];
  const validSet = new Set(existing.map((r) => r.id));
  const finalIds = ids.filter((id) => validSet.has(id));

  if (finalIds.length === 0) {
    return badRequest('Không có sản phẩm hợp lệ nào trong danh sách');
  }

  await sql`
    UPDATE products SET featured_rank = NULL
    WHERE featured_rank IS NOT NULL
      AND id <> ALL(${finalIds}::int[])
  `;

  for (let i = 0; i < finalIds.length; i++) {
    const id = finalIds[i];
    const rank = i + 1;
    await sql`UPDATE products SET featured_rank = ${rank} WHERE id = ${id}`;
  }

  return jsonOk({ count: finalIds.length, ids: finalIds }, { cache: 'no-store' });
}
