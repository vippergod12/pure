import type { NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/lib/server/auth';
import { jsonError, jsonOk } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return jsonError('Chưa đăng nhập', 401);
  return jsonOk({ admin }, { cache: 'no-store' });
}
