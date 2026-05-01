import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import {
  badRequest,
  jsonOk,
  notFound,
  parseStringArray,
  slugify,
  unauthorized,
} from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RELATED_LIMIT = 12;
const FEATURED_LIMIT = 12;

type RouteCtx = { params: { id: string } };

function parseIdent(value: string): { id?: number; slug?: string } {
  if (!value) return {};
  if (/^\d+$/.test(value)) return { id: Number(value) };
  return { slug: value };
}

function parseIncludes(req: NextRequest): { related: boolean; featured: boolean } {
  const value = req.nextUrl.searchParams.get('include');
  if (!value) return { related: false, featured: false };
  const parts = value.split(',').map((s) => s.trim().toLowerCase());
  return {
    related: parts.includes('related'),
    featured: parts.includes('featured'),
  };
}

function parseSale(body: { sale_price?: number | string | null; sale_end_at?: string | null }) {
  const rawPrice = body.sale_price;
  const salePrice =
    rawPrice === null || rawPrice === undefined || rawPrice === ''
      ? null
      : Number(rawPrice);
  if (salePrice !== null && (Number.isNaN(salePrice) || salePrice < 0)) {
    return { error: 'Giá sale không hợp lệ' as const };
  }
  const rawEnd = body.sale_end_at;
  const saleEndAt = rawEnd ? new Date(rawEnd) : null;
  if (saleEndAt && Number.isNaN(saleEndAt.getTime())) {
    return { error: 'Thời gian kết thúc sale không hợp lệ' as const };
  }
  return { salePrice, saleEndAt: saleEndAt ? saleEndAt.toISOString() : null, error: null };
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const ident = parseIdent(ctx.params.id);
  if (!ident.id && !ident.slug) return badRequest('Thiếu id hoặc slug');

  const includes = parseIncludes(req);

  const rows = (await sql`
    SELECT p.id, p.category_id, p.name, p.slug, p.description, p.price,
           p.sale_price, p.sale_end_at,
           p.image_url, p.colors,
           p.is_active, p.is_hero, p.featured_rank,
           p.created_at, p.updated_at,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE (${ident.id ?? null}::int IS NOT NULL AND p.id = ${ident.id ?? null}::int)
       OR (${ident.slug ?? null}::text IS NOT NULL AND p.slug = ${ident.slug ?? null}::text)
    LIMIT 1
  `) as Record<string, unknown>[];
  const product = rows[0];
  if (!product) return notFound('Không tìm thấy sản phẩm');

  if (!includes.related && !includes.featured) {
    return jsonOk(product, {
      cache: 'public',
      cacheOpts: { sMaxAge: 60, staleWhileRevalidate: 300 },
    });
  }

  const productId = product.id as number;
  const productCategoryId = product.category_id as number;

  const relatedPromise = includes.related
    ? sql`
        SELECT p.id, p.category_id, p.name, p.slug, p.price,
               p.sale_price, p.sale_end_at,
               p.image_url, p.colors,
               p.is_active, p.is_hero, p.featured_rank,
               p.created_at, p.updated_at,
               c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.category_id = ${productCategoryId}
          AND p.id <> ${productId}
        ORDER BY p.is_active DESC, p.created_at DESC
        LIMIT ${RELATED_LIMIT}
      `
    : Promise.resolve([] as Record<string, unknown>[]);

  const featuredPromise = includes.featured
    ? sql`
        SELECT p.id, p.category_id, p.name, p.slug, p.price,
               p.sale_price, p.sale_end_at,
               p.image_url, p.colors,
               p.is_active, p.featured_rank,
               p.created_at, p.updated_at,
               c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.featured_rank IS NOT NULL
          AND p.id <> ${productId}
        ORDER BY p.featured_rank ASC
        LIMIT ${FEATURED_LIMIT}
      `
    : Promise.resolve([] as Record<string, unknown>[]);

  const [related, featured] = await Promise.all([relatedPromise, featuredPromise]);

  return jsonOk(
    {
      product,
      related: includes.related ? related : undefined,
      featured: includes.featured ? featured : undefined,
    },
    { cache: 'public', cacheOpts: { sMaxAge: 60, staleWhileRevalidate: 300 } },
  );
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const ident = parseIdent(ctx.params.id);
  if (!ident.id && !ident.slug) return badRequest('Thiếu id hoặc slug');

  let body: {
    name?: string;
    slug?: string;
    description?: string | null;
    price?: number | string;
    sale_price?: number | string | null;
    sale_end_at?: string | null;
    image_url?: string | null;
    category_id?: number | string;
    is_active?: boolean;
    colors?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = (body.name ?? '').trim();
  const categoryId = Number(body.category_id);
  const price = Number(body.price ?? 0);
  if (!name) return badRequest('Tên sản phẩm không được trống');
  if (!categoryId) return badRequest('Cần chọn danh mục');
  if (Number.isNaN(price) || price < 0) return badRequest('Giá không hợp lệ');
  const sale = parseSale(body);
  if (sale.error) return badRequest(sale.error);
  const colors = parseStringArray(body.colors);
  const slug = (body.slug && body.slug.trim()) || slugify(name);
  const isActive = body.is_active ?? true;

  const rows = (await sql`
    UPDATE products
    SET category_id = ${categoryId},
        name = ${name},
        slug = ${slug},
        description = ${body.description ?? null},
        price = ${price},
        sale_price = ${sale.salePrice},
        sale_end_at = ${sale.saleEndAt},
        image_url = ${body.image_url ?? null},
        colors = ${colors}::text[],
        is_active = ${isActive},
        updated_at = NOW()
    WHERE (${ident.id ?? null}::int IS NOT NULL AND id = ${ident.id ?? null}::int)
       OR (${ident.slug ?? null}::text IS NOT NULL AND slug = ${ident.slug ?? null}::text)
    RETURNING id, category_id, name, slug, description, price,
              sale_price, sale_end_at,
              image_url, colors,
              is_active, is_hero, featured_rank,
              created_at, updated_at
  `) as Record<string, unknown>[];
  if (!rows[0]) return notFound('Không tìm thấy sản phẩm');
  return jsonOk(rows[0], { cache: 'no-store' });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const ident = parseIdent(ctx.params.id);
  if (!ident.id && !ident.slug) return badRequest('Thiếu id hoặc slug');

  let body: { is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const fields = Object.keys(body);
  if (!(fields.length === 1 && fields[0] === 'is_active')) {
    return badRequest('PATCH chỉ hỗ trợ trường is_active');
  }
  const isActive = Boolean(body.is_active);
  const rows = (await sql`
    UPDATE products
    SET is_active = ${isActive}, updated_at = NOW()
    WHERE (${ident.id ?? null}::int IS NOT NULL AND id = ${ident.id ?? null}::int)
       OR (${ident.slug ?? null}::text IS NOT NULL AND slug = ${ident.slug ?? null}::text)
    RETURNING id, category_id, name, slug, description, price,
              sale_price, sale_end_at,
              image_url, colors,
              is_active, is_hero, featured_rank,
              created_at, updated_at
  `) as Record<string, unknown>[];
  if (!rows[0]) return notFound('Không tìm thấy sản phẩm');
  return jsonOk(rows[0], { cache: 'no-store' });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const ident = parseIdent(ctx.params.id);
  if (!ident.id && !ident.slug) return badRequest('Thiếu id hoặc slug');

  const rows = (await sql`
    DELETE FROM products
    WHERE (${ident.id ?? null}::int IS NOT NULL AND id = ${ident.id ?? null}::int)
       OR (${ident.slug ?? null}::text IS NOT NULL AND slug = ${ident.slug ?? null}::text)
    RETURNING id
  `) as Record<string, unknown>[];
  if (!rows[0]) return notFound('Không tìm thấy sản phẩm');
  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
