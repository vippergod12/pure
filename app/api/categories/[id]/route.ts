import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import { badRequest, jsonOk, notFound, slugify, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: { id: string } };

function parseIdent(value: string): { id?: number; slug?: string } {
  if (!value) return {};
  if (/^\d+$/.test(value)) return { id: Number(value) };
  return { slug: value };
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const ident = parseIdent(ctx.params.id);
  if (!ident.id && !ident.slug) return badRequest('Thiếu id hoặc slug');

  const rows = (await sql`
    SELECT id, name, slug, image_url, description, created_at, updated_at
    FROM categories
    WHERE (${ident.id ?? null}::int IS NOT NULL AND id = ${ident.id ?? null}::int)
       OR (${ident.slug ?? null}::text IS NOT NULL AND slug = ${ident.slug ?? null}::text)
    LIMIT 1
  `) as Record<string, unknown>[];
  if (!rows[0]) return notFound('Không tìm thấy danh mục');
  return jsonOk(rows[0], {
    cache: 'public',
    cacheOpts: { sMaxAge: 300, staleWhileRevalidate: 1800 },
  });
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const ident = parseIdent(ctx.params.id);
  if (!ident.id && !ident.slug) return badRequest('Thiếu id hoặc slug');

  let body: {
    name?: string;
    slug?: string;
    image_url?: string | null;
    description?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const name = (body.name ?? '').trim();
  if (!name) return badRequest('Tên danh mục không được trống');
  const slug = (body.slug && body.slug.trim()) || slugify(name);

  const rows = (await sql`
    UPDATE categories
    SET name = ${name},
        slug = ${slug},
        image_url = ${body.image_url ?? null},
        description = ${body.description ?? null},
        updated_at = NOW()
    WHERE (${ident.id ?? null}::int IS NOT NULL AND id = ${ident.id ?? null}::int)
       OR (${ident.slug ?? null}::text IS NOT NULL AND slug = ${ident.slug ?? null}::text)
    RETURNING id, name, slug, image_url, description, created_at, updated_at
  `) as Record<string, unknown>[];
  if (!rows[0]) return notFound('Không tìm thấy danh mục');
  return jsonOk(rows[0], { cache: 'no-store' });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const ident = parseIdent(ctx.params.id);
  if (!ident.id && !ident.slug) return badRequest('Thiếu id hoặc slug');

  const rows = (await sql`
    DELETE FROM categories
    WHERE (${ident.id ?? null}::int IS NOT NULL AND id = ${ident.id ?? null}::int)
       OR (${ident.slug ?? null}::text IS NOT NULL AND slug = ${ident.slug ?? null}::text)
    RETURNING id
  `) as Record<string, unknown>[];
  if (!rows[0]) return notFound('Không tìm thấy danh mục');
  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
