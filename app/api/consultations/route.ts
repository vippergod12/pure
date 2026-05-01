import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import { badRequest, jsonError, jsonOk, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_GENDERS = new Set(['male', 'female', 'other']);

/**
 * POST /api/consultations
 * Public endpoint — không cần đăng nhập. Khách điền form /tu-van.
 *
 * Body: { name?: string, gender?: 'male'|'female'|'other', phone: string, note?: string }
 * Validate: phone bắt buộc, ít nhất 8 ký tự số (chấp nhận khoảng trắng, dấu +, -).
 */
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    gender?: string;
    phone?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('Payload không hợp lệ');
  }

  const phoneRaw = (body.phone ?? '').trim();
  const phoneDigits = phoneRaw.replace(/[^\d]/g, '');
  if (!phoneRaw) return badRequest('Số điện thoại bắt buộc');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return badRequest('Số điện thoại không hợp lệ (8–15 chữ số)');
  }

  const name = (body.name ?? '').trim().slice(0, 120) || null;
  const note = (body.note ?? '').trim().slice(0, 1000) || null;

  let gender: string | null = null;
  if (body.gender) {
    const g = body.gender.toLowerCase().trim();
    if (ALLOWED_GENDERS.has(g)) gender = g;
  }

  // Lấy IP để chống spam (rate-limit có thể thêm sau)
  const sourceIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    null;

  try {
    const rows = (await sql`
      INSERT INTO consultations (name, gender, phone, note, source_ip)
      VALUES (${name}, ${gender}, ${phoneRaw}, ${note}, ${sourceIp})
      RETURNING id, created_at
    `) as Array<{ id: number; created_at: string }>;
    return jsonOk(
      { ok: true, id: rows[0]?.id, created_at: rows[0]?.created_at },
      { status: 201, cache: 'no-store' },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
    // Trường hợp bảng chưa tồn tại — gợi ý chạy init-db
    if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('consultations')) {
      return jsonError(
        'Bảng consultations chưa tồn tại. Chạy `npm run db:init` để tạo schema.',
        500,
      );
    }
    return jsonError(msg, 500);
  }
}

/**
 * GET /api/consultations — chỉ admin xem danh sách.
 */
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauthorized();

  const rows = await sql`
    SELECT id, name, gender, phone, note, status, contacted_at, source_ip, created_at
    FROM consultations
    ORDER BY created_at DESC
    LIMIT 500
  `;
  return jsonOk(rows, { cache: 'no-store' });
}
