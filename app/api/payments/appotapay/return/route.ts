import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { applyAppotaPayCallback } from '@/lib/server/payment-orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function buildRedirectTarget(req: NextRequest, data: string | null, signature: string | null) {
  let target = new URL('/thanh-toan/ket-qua', req.nextUrl.origin);

  try {
    const result = await applyAppotaPayCallback({ data, signature });
    if (result.orderCode?.startsWith('TOPUP')) {
      target = new URL('/sandbox/nap-tien/ket-qua', req.nextUrl.origin);
    }
    if (result.orderCode) target.searchParams.set('order', result.orderCode);
    if (result.status) target.searchParams.set('status', result.status);
    if (!result.ok && result.reason) target.searchParams.set('error', result.reason.slice(0, 140));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể xử lý kết quả thanh toán';
    target.searchParams.set('status', 'error');
    target.searchParams.set('error', message.slice(0, 140));
  }

  return target;
}

async function readPostedResult(req: NextRequest): Promise<{ data: string | null; signature: string | null }> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await req.json().catch(() => null)) as { data?: unknown; signature?: unknown } | null;
    return {
      data: typeof body?.data === 'string' ? body.data : null,
      signature: typeof body?.signature === 'string' ? body.signature : null,
    };
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await req.formData().catch(() => null);
    return {
      data: typeof form?.get('data') === 'string' ? String(form.get('data')) : null,
      signature: typeof form?.get('signature') === 'string' ? String(form.get('signature')) : null,
    };
  }

  return { data: null, signature: null };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const target = await buildRedirectTarget(req, sp.get('data'), sp.get('signature'));
  return NextResponse.redirect(target);
}

export async function POST(req: NextRequest) {
  const body = await readPostedResult(req);
  const sp = req.nextUrl.searchParams;
  const target = await buildRedirectTarget(
    req,
    body.data ?? sp.get('data'),
    body.signature ?? sp.get('signature'),
  );
  return NextResponse.redirect(target);
}
