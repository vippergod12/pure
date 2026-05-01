import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import { badRequest, jsonOk, notFound, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: { id: string } };

const ALLOWED_STATUSES = new Set(['new', 'contacted']);

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * PATCH /api/consultations/[id]
 * Admin-only. Hiện chỉ hỗ trợ trường `status` ('new' | 'contacted').
 *
 * Server tự stamp `contacted_at`:
 *   - status = 'contacted'  → contacted_at = NOW() (chỉ set lần đầu, lần sau giữ nguyên)
 *   - status = 'new'        → contacted_at = NULL (reset về chưa liên hệ)
 *
 * Vì vậy client KHÔNG được gửi contacted_at — server quyết định để tránh
 * lệch giờ với máy admin.
 */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const id = parseId(ctx.params.id);
  if (id === null) return badRequest('ID không hợp lệ');

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const status = (body.status ?? '').toLowerCase().trim();
  if (!ALLOWED_STATUSES.has(status)) {
    return badRequest("status phải là 'new' hoặc 'contacted'");
  }

  // contacted_at được stamp ở server để giờ chuẩn (UTC trong DB).
  // CASE: lần đầu chuyển sang contacted → set NOW(); nếu đã contacted từ trước
  // mà admin lại "tick lại" thì giữ nguyên contacted_at cũ (không reset thời gian).
  const rows = (await sql`
    UPDATE consultations
    SET
      status = ${status},
      contacted_at = CASE
        WHEN ${status} = 'contacted' AND contacted_at IS NULL THEN NOW()
        WHEN ${status} = 'new' THEN NULL
        ELSE contacted_at
      END
    WHERE id = ${id}
    RETURNING id, name, gender, phone, note, status, contacted_at, source_ip, created_at
  `) as Record<string, unknown>[];

  if (!rows[0]) return notFound('Không tìm thấy yêu cầu tư vấn');
  return jsonOk(rows[0], { cache: 'no-store' });
}

/**
 * DELETE /api/consultations/[id] — admin xoá yêu cầu (vd: spam).
 */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const id = parseId(ctx.params.id);
  if (id === null) return badRequest('ID không hợp lệ');

  const rows = (await sql`
    DELETE FROM consultations WHERE id = ${id} RETURNING id
  `) as Record<string, unknown>[];
  if (!rows[0]) return notFound('Không tìm thấy yêu cầu tư vấn');

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
