import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import { badRequest, jsonError, jsonOk, slugify, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`
    SELECT c.id, c.name, c.slug, c.image_url, c.description, c.created_at, c.updated_at,
           (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c
    ORDER BY c.name ASC
  `;
  return jsonOk(rows, {
    cache: 'public',
    cacheOpts: { sMaxAge: 300, staleWhileRevalidate: 1800 },
  });
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauthorized();

  let body: {
    name?: string;
    slug?: string;
    image_url?: string;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = (body.name ?? '').trim();
  if (!name) return badRequest('Tên danh mục không được trống');
  const slug = (body.slug && body.slug.trim()) || slugify(name);
  const image_url = body.image_url ?? null;
  const description = body.description ?? null;

  try {
    const rows = (await sql`
      INSERT INTO categories (name, slug, image_url, description)
      VALUES (${name}, ${slug}, ${image_url}, ${description})
      RETURNING id, name, slug, image_url, description, created_at, updated_at
    `) as Record<string, unknown>[];
    return jsonOk(rows[0], { status: 201, cache: 'no-store' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
    if (msg.includes('duplicate')) return jsonError('Slug đã tồn tại', 409);
    return jsonError(msg, 500);
  }
}
