import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import { badRequest, jsonOk, notFound, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: { id: string } };

const ALLOWED_STATUSES = new Set([
  'created',
  'pending',
  'processing',
  'awaiting_transfer',
  'paid',
  'failed',
  'cancelled',
  'amount_mismatch',
]);

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const id = parseId(ctx.params.id);
  if (id === null) return badRequest('ID khong hop le');

  const rows = await sql`
    SELECT id, order_code, product_id, product_snapshot, selected_color, quantity,
           amount, currency, customer_name, customer_phone, customer_email,
           customer_note, payment_provider, payment_method, bank_code, payment_url,
           provider_transaction_id, status, appotapay_status, appotapay_error_code,
           appotapay_error_message, appotapay_payload, momo_result_code, momo_message,
           momo_pay_type, momo_request_id, momo_payload, admin_note, paid_at,
           created_at, updated_at
    FROM orders
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return notFound('Khong tim thay don hang');
  return jsonOk(rows[0], { cache: 'no-store' });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const id = parseId(ctx.params.id);
  if (id === null) return badRequest('ID khong hop le');

  let body: {
    status?: string;
    provider_transaction_id?: string | null;
    admin_note?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const status = (body.status ?? '').toLowerCase().trim();
  if (!ALLOWED_STATUSES.has(status)) {
    return badRequest('Trang thai don hang khong hop le');
  }

  const transactionId = cleanText(body.provider_transaction_id, 120);
  const adminNote = cleanText(body.admin_note, 1000);

  const rows = await sql`
    UPDATE orders
    SET status = ${status},
        provider_transaction_id = ${transactionId},
        admin_note = ${adminNote},
        paid_at = CASE
          WHEN ${status} = 'paid' AND paid_at IS NULL THEN NOW()
          WHEN ${status} <> 'paid' THEN NULL
          ELSE paid_at
        END,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, order_code, product_id, product_snapshot, selected_color, quantity,
              amount, currency, customer_name, customer_phone, customer_email,
              customer_note, payment_provider, payment_method, bank_code, payment_url,
              provider_transaction_id, status, appotapay_status, appotapay_error_code,
              appotapay_error_message, appotapay_payload, momo_result_code, momo_message,
              momo_pay_type, momo_request_id, momo_payload, admin_note, paid_at,
              created_at, updated_at
  `;

  if (!rows[0]) return notFound('Khong tim thay don hang');
  return jsonOk(rows[0], { cache: 'no-store' });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  if (!getAdminFromRequest(req)) return unauthorized();
  const id = parseId(ctx.params.id);
  if (id === null) return badRequest('ID khong hop le');

  const rows = await sql`DELETE FROM orders WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return notFound('Khong tim thay don hang');

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
