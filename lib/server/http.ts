import { NextResponse } from 'next/server';

/**
 * Bật CDN cache cho response GET công khai.
 *
 * Trên Vercel Edge:
 *   - `s-maxage`: thời gian cache "tươi" (giây)
 *   - `stale-while-revalidate`: trong khoảng này phục vụ phiên bản cũ ngay,
 *     đồng thời revalidate trong nền → user không bao giờ phải chờ DB
 *
 * Admin có thể bypass cache bằng cách thêm query param ngẫu nhiên (`?_t=<ts>`),
 * vì Vercel CDN dùng full URL làm key.
 */
export function publicCacheHeaders(options: { sMaxAge?: number; staleWhileRevalidate?: number } = {}) {
  const sMaxAge = options.sMaxAge ?? 60;
  const swr = options.staleWhileRevalidate ?? 300;
  return {
    'Cache-Control': `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  };
}

export function noStoreHeaders() {
  return { 'Cache-Control': 'private, no-store, max-age=0' };
}

export function jsonOk<T>(
  data: T,
  init?: { status?: number; cache?: 'public' | 'no-store'; cacheOpts?: { sMaxAge?: number; staleWhileRevalidate?: number } },
) {
  const status = init?.status ?? 200;
  const headers: Record<string, string> = {};
  if (init?.cache === 'public') Object.assign(headers, publicCacheHeaders(init.cacheOpts));
  else if (init?.cache === 'no-store') Object.assign(headers, noStoreHeaders());
  return NextResponse.json(data as unknown as object, { status, headers });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export const badRequest = (message: string) => jsonError(message, 400);
export const unauthorized = (message = 'Cần đăng nhập admin') => jsonError(message, 401);
export const notFound = (message = 'Không tìm thấy') => jsonError(message, 404);

export function methodNotAllowed(allow: string[]) {
  return new NextResponse(JSON.stringify({ message: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      Allow: allow.join(', '),
    },
  });
}

export function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
