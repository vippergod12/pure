import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { applyMomoCallback } from '@/lib/server/payment-orders';
import type { MomoPaymentResultPayload } from '@/lib/server/momo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: MomoPaymentResultPayload;
  try {
    body = (await req.json()) as MomoPaymentResultPayload;
  } catch {
    return jsonError('Payload khong hop le', 400);
  }

  try {
    const result = await applyMomoCallback(body);
    if (!result.ok) return jsonError(result.reason ?? 'Khong the xac nhan IPN MoMo', 400);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Khong the xu ly IPN MoMo';
    return jsonError(message, 500);
  }
}
