import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { applyMomoCallback } from '@/lib/server/payment-orders';
import type { MomoPaymentResultPayload } from '@/lib/server/momo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function searchParamsToPayload(req: NextRequest): MomoPaymentResultPayload {
  const payload: MomoPaymentResultPayload = {};
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    payload[key] = value;
  }
  return payload;
}

export async function GET(req: NextRequest) {
  const payload = searchParamsToPayload(req);
  const target = new URL('/thanh-toan/ket-qua', req.nextUrl.origin);

  try {
    const result = await applyMomoCallback(payload);
    const orderCode = result.orderCode ?? (typeof payload.orderId === 'string' ? payload.orderId : null);
    if (orderCode) target.searchParams.set('order', orderCode);
    if (result.status) target.searchParams.set('status', result.status);
    if (!result.ok && result.reason) target.searchParams.set('error', result.reason.slice(0, 140));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Khong the xu ly ket qua thanh toan MoMo';
    if (typeof payload.orderId === 'string') target.searchParams.set('order', payload.orderId);
    target.searchParams.set('status', 'error');
    target.searchParams.set('error', message.slice(0, 140));
  }

  return NextResponse.redirect(target);
}
