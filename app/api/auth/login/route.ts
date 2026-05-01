import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { signAdminToken } from '@/lib/server/auth';
import { badRequest, jsonError, jsonOk } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const username = (body.username ?? '').trim();
  const password = body.password ?? '';
  if (!username || !password) return badRequest('Thiếu username hoặc password');

  const rows = (await sql`
    SELECT id, username, password_hash FROM admins WHERE username = ${username} LIMIT 1
  `) as { id: number; username: string; password_hash: string }[];

  const admin = rows[0];
  if (!admin) return jsonError('Sai tài khoản hoặc mật khẩu', 401);

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return jsonError('Sai tài khoản hoặc mật khẩu', 401);

  const token = signAdminToken({ sub: admin.id, username: admin.username });
  return jsonOk({ token, admin: { id: admin.id, username: admin.username } });
}
