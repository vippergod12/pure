import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { getAdminFromRequest } from '@/lib/server/auth';
import { jsonOk, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauthorized();

  const rows = await sql`
    SELECT id, order_code, product_id, product_snapshot, selected_color, quantity,
           amount, currency, customer_name, customer_phone, customer_email,
           customer_note, payment_provider, payment_method, bank_code, payment_url,
           provider_transaction_id, status, appotapay_status, appotapay_error_code,
           appotapay_error_message, appotapay_payload, momo_result_code, momo_message,
           momo_pay_type, momo_request_id, momo_payload, admin_note, paid_at,
           created_at, updated_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 1000
  `;

  return jsonOk(rows, { cache: 'no-store' });
}
