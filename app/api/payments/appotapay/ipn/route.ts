import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/server/http';
import { applyAppotaPayCallback } from '@/lib/server/payment-orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { data?: string; signature?: string };
  try {
    body = (await req.json()) as { data?: string; signature?: string };
  } catch {
    return jsonError('Payload không hợp lệ', 400);
  }

  try {
    const result = await applyAppotaPayCallback({
      data: body.data ?? null,
      signature: body.signature ?? null,
    });
    if (!result.ok) return jsonError(result.reason ?? 'Không thể xác nhận IPN', 400);
    return jsonOk({ status: 'ok' }, { cache: 'no-store' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể xử lý IPN';
    return jsonError(message, 500);
  }
}
