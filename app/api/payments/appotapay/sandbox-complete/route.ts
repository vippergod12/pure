import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { badRequest, jsonError, jsonOk, notFound } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CompleteBody = {
  orderCode?: string;
};

function isSandboxEnvironment(): boolean {
  const env = (process.env.APPOTAPAY_ENV ?? 'sandbox').trim().toLowerCase();
  const gatewayUrl = (process.env.APPOTAPAY_GATEWAY_URL ?? '').trim().toLowerCase().replace(/\/+$/, '');
  return env !== 'production' && gatewayUrl !== 'https://gateway.appotapay.com';
}

function normalizeOrderCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (!/^(PURE|TOPUP)[A-Z0-9]{8,80}$/.test(code)) return null;
  return code;
}

export async function POST(req: NextRequest) {
  if (!isSandboxEnvironment()) {
    return jsonError('Chức năng giả lập thanh toán chỉ được bật ở AppotaPay sandbox', 403);
  }

  let body: CompleteBody;
  try {
    body = (await req.json()) as CompleteBody;
  } catch {
    return badRequest('Payload không hợp lệ');
  }

  const orderCode = normalizeOrderCode(body.orderCode);
  if (!orderCode) return badRequest('Mã đơn không hợp lệ');

  const rows = await sql`
    UPDATE orders
    SET status = 'paid',
        appotapay_status = 'success',
        appotapay_error_code = NULL,
        appotapay_error_message = NULL,
        paid_at = COALESCE(paid_at, NOW()),
        admin_note = CASE
          WHEN admin_note IS NULL OR admin_note = ''
            THEN 'Sandbox: giả lập AppotaPay thanh toán thành công.'
          WHEN admin_note NOT ILIKE '%Sandbox: giả lập AppotaPay thanh toán thành công.%'
            THEN admin_note || E'\nSandbox: giả lập AppotaPay thanh toán thành công.'
          ELSE admin_note
        END,
        updated_at = NOW()
    WHERE order_code = ${orderCode}
      AND payment_provider IN ('appotapay', 'appotapay_sandbox_topup')
    RETURNING order_code, status, paid_at
  `;

  if (!rows[0]) return notFound('Không tìm thấy đơn AppotaPay sandbox');

  return jsonOk(rows[0], { cache: 'no-store' });
}
